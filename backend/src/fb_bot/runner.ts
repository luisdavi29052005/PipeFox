import { BrowserContext, Page, Locator } from 'playwright'
import { supabase } from '../supabaseClient'
import { openContextForAccount } from './context'
import { upsertLead } from '../api/leads'
import { sanitizeFacebookUrl } from '../utils/sanitizeFacebookUrl'
import { config as loadEnv } from 'dotenv'

loadEnv()

/* ---------------------------------- CONSTS --------------------------------- */
const ENV_WEBHOOK = process.env.N8N_WEBHOOK_URL ?? ''
/** Seletor único do layout Comet para qualquer post dentro do feed */
const POST_SELECTOR = 'div[role="feed"] div[role="article"]'

/* --------------------------------- TYPES ----------------------------------- */
interface WorkflowNode {
  id: string
  group_url: string
  group_name: string
  prompt: string              // ← agora incluído
  is_active: boolean
  keywords?: string[]
}

export interface WorkflowConfig {
  id: string
  account_id: string
  nodes: WorkflowNode[]
}

interface ShotMeta {
  id: string
  url: string
  timestamp: string
  node_id: string
}

/* ------------------------------ STATE CONTROL ------------------------------ */
const running = new Map<string, boolean>()

/* =============================== PUBLIC API ================================ */
export async function startRunner(cfg: WorkflowConfig) {
  if (running.has(cfg.id)) return
  running.set(cfg.id, true)

  const results = await Promise.allSettled(cfg.nodes.map((n) => processGroup(cfg, n)))
  console.log(
    `[runner] ${results.filter((r) => r.status === 'fulfilled').length} grupos OK, ${results.filter((r) => r.status === 'rejected').length} falharam — workflow ${cfg.id}`
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
  } catch (err) {
    console.error('[runner] erro no grupo', err)
  } finally {
    if (ctx) await ctx.close().catch(() => {})
  }
}

/* ========================= SCREENSHOT COLLECTION ========================== */
async function collectShots(page: Page, node: WorkflowNode) {
  const MAX_EMPTY = 3
  const collected: { data: ShotMeta; png: Buffer }[] = []
  const seen = new Set<string>()

  await page.waitForSelector('div[role="feed"]', { timeout: 60_000 })
  let empty = 0

  for (;;) {
    await Promise.race([
      page.waitForSelector(`${POST_SELECTOR}:not([data-pipefox])`, { timeout: 15_000 }).catch(() => {}),
      page.waitForTimeout(4_000)
    ])

    const handles = await page.locator(`${POST_SELECTOR}:not([data-pipefox])`).elementHandles()
    if (!handles.length) {
      if (++empty >= MAX_EMPTY) break
    } else empty = 0

    for (const el of handles) {
      try {
        await el.evaluate((n) => n.setAttribute('data-pipefox', 'done'))
        if (!(await el.isVisible())) continue
        await el.scrollIntoViewIfNeeded({ timeout: 1_500 }).catch(() => {})

        const png = await el.screenshot({ type: 'png' })
        const meta = await makeShotMeta(el, node.id)
        if (seen.has(meta.id)) continue

        // upsert lead — ignora se já existe
        const lead = await upsertLead(node.id, meta.url)
        if (!lead) continue

        seen.add(meta.id)
        collected.push({ data: meta, png })
        console.log(`[collect] shot id ${meta.id}`)
      } catch {
        /* ignora posts que sumirem no meio do caminho */
      }
    }

    // scroll uma viewport p/ carregar mais posts
    await page.mouse.wheel(0, page.viewportSize()?.height ?? 800)
  }

  return collected
}

/* ------------------------- METADATA EXTRACTION -------------------------- */
async function makeShotMeta(el: Locator, nodeId: string): Promise<ShotMeta> {
  let href = ''
  try {
    const a = await el.$('a[href*="/posts/"], a[href*="/permalink/"]')
    href = a ? (await a.getAttribute('href')) || '' : ''
  } catch {}

  if (href && !href.startsWith('http')) href = `https://facebook.com${href}`
  href = sanitizeFacebookUrl(href)

  const idMatch = href.match(/(?:posts|permalink|videos|photo)\/(\d+)/)
  const id = idMatch ? idMatch[1] : `${Date.now()}${Math.random().toString(16).slice(2, 6)}`

  return {
    id,
    url: href || `https://facebook.com/post/${id}`,
    timestamp: new Date().toISOString(),
    node_id: nodeId
  }
}

/* ============================= N8N INTEGRATION ============================= */
async function sendShotToN8n(meta: ShotMeta, buf: Buffer, groupName = '', prompt = '') {
  if (!ENV_WEBHOOK) {
    console.log('[n8n] webhook ausente; pulando')
    return
  }

  const payload = {
    ...meta,
    prompt,                     // ← incluído
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
  } catch (err) {
    console.error('[n8n] falha no envio', err)
  }
}
