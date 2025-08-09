import { BrowserContext, Page, Locator, ElementHandle } from 'playwright'
import { supabase } from '../supabaseClient'
import { openContextForAccount } from './context'
import { upsertLead } from '../api/leads'
import { sanitizeFacebookUrl } from '../utils/sanitizeFacebookUrl'
import { config as loadEnv } from 'dotenv'

loadEnv()

/* ---------------------------------- CONSTS --------------------------------- */
const ENV_WEBHOOK = process.env.N8N_WEBHOOK_URL ?? ''
/**
 * NOVO SELETOR ROBUSTO:
 * A estrutura do feed mudou. Agora, o contêiner de cada post principal
 * (e não o dos comentários) possui um atributo 'aria-describedby'.
 * Este seletor busca por esse contêiner, garantindo que pegamos apenas os posts.
 */
const POST_SELECTOR = 'div[role="feed"] div[aria-describedby]'


/* --------------------------------- TYPES ----------------------------------- */
// ...nenhuma alteração necessária aqui...
interface WorkflowNode {
  id: string
  group_url: string
  group_name: string
  prompt: string
  is_active: boolean
  keywords?: string[]
}

export interface WorkflowConfig {
  id: string
  account_id: string
  nodes: WorkflowNode[]
}

interface PostData {
  id: string;
  url: string;
  timestamp: string;
  node_id: string;
  // Adicione outros campos se precisar extrair mais dados
  authorName?: string;
  text?: string;
}

interface ShotPackage {
  data: PostData
  png: Buffer
}

/* ------------------------------ STATE CONTROL ------------------------------ */
const running = new Map<string, boolean>()

/* =============================== PUBLIC API ================================ */
export async function startRunner(cfg: WorkflowConfig) {
  if (running.has(cfg.id)) return
  running.set(cfg.id, true)

  const results = await Promise.allSettled(cfg.nodes.map((n) => processGroup(cfg, n)))
  console.log(
    `[runner] ${results.filter((r) => r.status === 'fulfilled').length} grupos OK, ${
      results.filter((r) => r.status === 'rejected').length
    } falharam — workflow ${cfg.id}`
  )

  running.delete(cfg.id)
}

export async function stopRunner(id: string) {
  running.delete(id)
  await supabase.from('workflows').update({ status: 'stopped' }).eq('id', id)
}

/* =============================== GROUP LEVEL =============================== */
async function processGroup(cfg: WorkflowConfig, node: WorkflowNode) {
  console.log(`[runner] grupo: ${node.group_name}`)
  let ctx: BrowserContext | null = null

  try {
    const { data: acc } = await supabase
      .from('accounts')
      .select('user_id')
      .eq('id', cfg.account_id)
      .single()
    if (!acc) throw new Error('Conta não encontrada')

    ctx = await openContextForAccount(acc.user_id, cfg.account_id)
    const page = await ctx.newPage()

    await page.goto(node.group_url, { waitUntil: 'load', timeout: 60_000 })
    const shots = await collectShots(page, node)

    if (shots.length) {
      await Promise.allSettled(
        shots.map(({ data, png }) => sendShotToN8n(data, png, node.group_name, node.prompt))
      )
    } else {
      console.log('[runner] nenhum post novo')
    }
  } catch (err: any) {
    console.error(`[runner] erro no grupo: ${err.message}`)
  } finally {
    if (ctx) await ctx.close().catch(() => {})
  }
}

/* ========================= SCREENSHOT COLLECTION ========================== */
async function collectShots(page: Page, node: WorkflowNode): Promise<ShotPackage[]> {
  const MAX_EMPTY = 3
  const collected: ShotPackage[] = []
  const seen = new Set<string>()

  // Espera mais robusta pelo carregamento do feed
  try {
      await page.waitForSelector('div[role="feed"] > div', { timeout: 20_000 })
      console.log('[collect] Feed detectado, iniciando coleta.')
  } catch {
      console.warn('[collect] Feed não carregou no tempo esperado, tentando continuar mesmo assim.')
  }

  let empty = 0

  for (let i = 0; i < 50; i++) { // Loop de segurança
    await page.waitForTimeout(Math.random() * 1000 + 1500) // Pausa humanizada

    const handles = await page.locator(`${POST_SELECTOR}:not([data-pipefox])`).elementHandles()
    
    if (!handles.length) {
      if (++empty >= MAX_EMPTY) {
        console.log('[collect] Fim do feed alcançado.')
        break
      }
    } else {
      empty = 0
    }

    for (const el of handles) {
      try {
        await el.evaluate((n) => n.setAttribute('data-pipefox', 'done'))
        if (!(await el.isVisible())) continue
        
        await el.scrollIntoViewIfNeeded({ timeout: 1_500 }).catch(() => {})

        // O 'el' agora é o contêiner correto, então o screenshot será do post.
        const png = await el.screenshot({ type: 'png' })
        const meta = await makeShotMeta(el, node.id)
        if (seen.has(meta.id)) continue

        const lead = await upsertLead(node.id, meta.url)
        if (!lead) continue

        seen.add(meta.id)
        collected.push({ data: meta, png })
        console.log(`[collect] shot id ${meta.id}`)
      } catch (error) {
        // Ignora posts que desaparecem ou causam erro
      }
    }

    await page.mouse.wheel(0, page.viewportSize()?.height ?? 800)
  }

  return collected
}

/* ------------------------- METADATA EXTRACTION -------------------------- */
async function makeShotMeta(el: ElementHandle, nodeId: string): Promise<PostData> {
  let href = ''
  try {
    // Busca o link dentro do contêiner do post
    const a = await el.$('a[href*="/posts/"], a[href*="/permalink/"]')
    href = a ? (await a.getAttribute('href')) || '' : ''
  } catch {}

  if (href && !href.startsWith('http')) href = `https://facebook.com${href}`
  href = sanitizeFacebookUrl(href)

  const idMatch = href.match(/(?:posts|permalink|videos|photo)\/(\d+)/)
  const id = idMatch ? idMatch[1] : `${Date.now()}${Math.random().toString(16).slice(2, 6)}`

  // Extrair outros dados se necessário
  const authorName = await el.$('h3 a, h2 a, strong a').then(h => h?.innerText()).catch(() => undefined)
  const text = await el.$('div[data-ad-preview="message"], div[dir="auto"]').then(d => d?.innerText()).catch(() => undefined)

  return {
    id,
    url: href || `https://facebook.com/post/${id}`,
    timestamp: new Date().toISOString(),
    node_id: nodeId,
    authorName,
    text,
  }
}

/* ============================= N8N INTEGRATION ============================= */
async function sendShotToN8n(meta: PostData, buf: Buffer, groupName = '', prompt = '') {
  if (!ENV_WEBHOOK) {
    console.log('[n8n] webhook ausente; pulando')
    return
  }

  const payload = {
    ...meta,
    prompt,
    screenshot: buf.toString('base64'),
    screenshot_type: 'png',
    group_name: groupName
  }

  try {
    const res = await fetch(ENV_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    console.log(`[n8n] shot ${meta.id} enviado para ${groupName}`)
  } catch (err: any) {
    console.error('[n8n] falha no envio:', err)
  }
}