import { BrowserContext, Page, Locator } from 'playwright'
import { supabase } from '../supabaseClient'
import { openContextForAccount } from './context'
import { upsertLead } from '../api/leads'
import { config as loadEnv } from 'dotenv'

loadEnv()

/* ---------------------------------- CONSTS --------------------------------- */
const ENV_WEBHOOK = process.env.N8N_WEBHOOK_URL ?? ''

/** Seletores para posts excluindo áreas de comentários e interações */
const POST_SELECTOR_SEM_COMENTARIOS = `
  div[role="article"]:not(:has([aria-label*="comentário" i])):not(:has([aria-label*="comment" i])):not(:has([data-ad-rendering-role="comment_button"])):not(:has(form[aria-label*="comentário" i])):not(:has(form[aria-label*="comment" i])),
  article[data-ft]:not(:has([aria-label*="comentário" i])):not(:has([aria-label*="comment" i])):not(:has([data-ad-rendering-role="comment_button"])):not(:has(form[aria-label*="comentário" i])):not(:has(form[aria-label*="comment" i])),
  div[data-pagelet^="FeedUnit_"]:not(:has([aria-label*="comentário" i])):not(:has([aria-label*="comment" i])):not(:has([data-ad-rendering-role="comment_button"])):not(:has(form[aria-label*="comentário" i])):not(:has(form[aria-label*="comment" i]))
`.replace(/\s+/g, ' ').trim()

/** XPath como fallback para posts sem comentários */
const POST_SELECTOR_XPATH = `
  //div[@role="article"][not(descendant::*[contains(@aria-label, "comentário") or contains(@aria-label, "comment") or contains(@aria-label, "Comment") or contains(@aria-label, "Comentário")])]
  [not(descendant::*[@data-ad-rendering-role="comment_button"])]
  [not(descendant::form[contains(@aria-label, "comentário") or contains(@aria-label, "comment")])]
  [not(starts-with(@aria-label, "Comentário de") or starts-with(@aria-label, "Comment by"))]
  |
  //article[@data-ft][not(descendant::*[contains(@aria-label, "comentário") or contains(@aria-label, "comment") or contains(@aria-label, "Comment") or contains(@aria-label, "Comentário")])]
  [not(descendant::*[@data-ad-rendering-role="comment_button"])]
  [not(descendant::form[contains(@aria-label, "comentário") or contains(@aria-label, "comment")])]
  [not(starts-with(@aria-label, "Comentário de") or starts-with(@aria-label, "Comment by"))]
`.replace(/\s+/g, ' ').trim()

/* ------------------------------ TYPES ------------------------------- */
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
  id: string
  url: string
  screenshot: Buffer
  node_id: string
  timestamp: string
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
  console.log(`[runner] Processando grupo: ${node.group_name}`)
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

    // Otimiza carregamento
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType()
      if (['font', 'media', 'websocket'].includes(resourceType)) {
        route.abort()
      } else {
        route.continue()
      }
    })

    await page.goto(node.group_url, { waitUntil: 'domcontentloaded', timeout: 60_000 })

    // Aguarda carregamento do feed
    await waitForFeedLoad(page)

    const posts = await collectAndScreenshotPosts(page, node)

    console.log(`[runner] ${posts.length} posts processados do grupo ${node.group_name}`)

  } catch (err) {
    console.error('[runner] Erro no processamento do grupo:', err)
  } finally {
    if (ctx) await ctx.close().catch(() => {})
  }
}

/* ========================= FEED LOADING & COLLECTION ========================== */
async function waitForFeedLoad(page: Page, timeout = 30_000) {
  console.log('[runner] Aguardando carregamento do feed...')

  try {
    await Promise.race([
      page.waitForSelector('div[role="feed"]', { timeout }),
      page.waitForSelector('div[role="article"]', { timeout }),
      page.waitForSelector('article', { timeout }),
      page.waitForTimeout(timeout)
    ])

    console.log('[runner] Feed carregado com sucesso')
  } catch (error) {
    console.log('[runner] Timeout no carregamento do feed - continuando...')
  }
}

/** Função para encontrar posts usando seletores sem comentários */
async function findPostsWithFallback(page: Page) {
  try {
    // Primeiro tenta o seletor CSS semântico
    const posts = page.locator(POST_SELECTOR_SEM_COMENTARIOS)
    const count = await posts.count()
    if (count > 0) {
      console.log(`[runner] Posts encontrados com seletor semântico: ${count} posts`)
      return posts
    }
  } catch (error) {
    console.log(`[runner] Erro com seletor CSS semântico:`, error)
  }

  try {
    // Fallback para XPath
    const posts = page.locator(`xpath=${POST_SELECTOR_XPATH}`)
    const count = await posts.count()
    if (count > 0) {
      console.log(`[runner] Posts encontrados com XPath: ${count} posts`)
      return posts
    }
  } catch (error) {
    console.log(`[runner] Erro com seletor XPath:`, error)
  }

  // Último recurso - seletor básico com filtros manuais
  console.log('[runner] Usando seletor básico com filtros manuais')
  const basicPosts = page.locator('div[role="article"], article[data-ft]')
  return basicPosts.filter({
    has: page.locator(':not([aria-label*="comentário" i]):not([aria-label*="comment" i]):not([data-ad-rendering-role="comment_button"])')
  })
}

async function collectAndScreenshotPosts(page: Page, node: WorkflowNode): Promise<PostData[]> {
  const collected: PostData[] = []
  const processed = new Set<string>()
  let scrollAttempts = 0
  const MAX_SCROLLS = 10

  while (scrollAttempts < MAX_SCROLLS) {
    const postsLocator = await findPostsWithFallback(page)
    const currentCount = await postsLocator.count()

    console.log(`[collect] ${currentCount} posts encontrados (tentativa ${scrollAttempts + 1})`)

    // Processa posts novos
    for (let i = 0; i < currentCount; i++) {
      const postContainer = postsLocator.nth(i)

      try {
        // Verifica se já foi processado
        const isProcessed = await postContainer.getAttribute('data-pipefox-processed')
        if (isProcessed) continue

        // Marca como processado
        await postContainer.evaluate(el => el.setAttribute('data-pipefox-processed', 'true'))

        // Verifica se está visível
        if (!(await postContainer.isVisible())) continue

        // Validação adicional: verifica se não é área de comentário
        const isCommentArea = await postContainer.evaluate(el => {
          const ariaLabel = el.getAttribute('aria-label') || ''
          const hasCommentButton = !!el.querySelector('[data-ad-rendering-role="comment_button"]')
          const hasCommentForm = !!el.querySelector('form[aria-label*="comentário"], form[aria-label*="comment"]')
          const hasCommentInput = !!el.querySelector('div[contenteditable][aria-placeholder*="comentário"], div[contenteditable][aria-placeholder*="comment"]')
          
          return (
            ariaLabel.toLowerCase().includes('comentário') ||
            ariaLabel.toLowerCase().includes('comment') ||
            ariaLabel.startsWith('Comentário de') ||
            ariaLabel.startsWith('Comment by') ||
            hasCommentButton ||
            hasCommentForm ||
            hasCommentInput
          )
        })

        if (isCommentArea) {
          console.log(`[collect] Post ${i} ignorado: área de comentário detectada`)
          continue
        }

        // Rola para o post
        await postContainer.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {})
        await page.waitForTimeout(500)

        // Tira screenshot do post - SEM PARÂMETRO QUALITY
        const screenshot = await postContainer.screenshot({ type: 'png' })

        // Gera ID único simples
        const postId = `post_${node.id}_${Date.now()}_${i}`
        const postUrl = page.url()

        // Verifica se é duplicado
        if (processed.has(postId)) continue
        processed.add(postId)

        // Upsert no banco
        const lead = await upsertLead(node.id, postUrl)
        if (!lead) continue

        const postData: PostData = {
          id: postId,
          url: postUrl,
          screenshot,
          node_id: node.id,
          timestamp: new Date().toISOString()
        }

        collected.push(postData)

        // Envia para N8N
        await sendToN8N(postData, lead.id, node)

        console.log(`[collect] Post ${postId} processado e enviado para N8N`)

      } catch (error) {
        console.error(`[collect] Erro processando post ${i}:`, error)
        continue
      }
    }

    // Scroll suave
    await humanizedScroll(page)
    scrollAttempts++
  }

  return collected
}

async function humanizedScroll(page: Page) {
  const viewport = page.viewportSize()
  const scrollDistance = viewport ? Math.floor(viewport.height * 0.7) : 600

  await page.mouse.wheel(0, scrollDistance)
  await page.waitForTimeout(1500 + Math.random() * 1000)
}

/* ============================= N8N INTEGRATION ============================= */
async function sendToN8N(postData: PostData, leadId: string, node: WorkflowNode) {
  if (!ENV_WEBHOOK) {
    console.log('[n8n] Webhook não configurado - pulando processamento')
    return
  }

  try {
    console.log(`[n8n] Enviando post ${postData.id} para N8N...`)

    const payload = {
      lead_id: leadId,
      post_id: postData.id,
      post_url: postData.url,
      group_name: node.group_name,
      prompt: node.prompt,
      screenshot: postData.screenshot.toString('base64'),
      screenshot_type: 'png',
      timestamp: postData.timestamp,
      node_id: node.id
    }

    const response = await fetch(ENV_WEBHOOK, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'PipeFox/1.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      throw new Error(`N8N respondeu com status ${response.status}: ${await response.text()}`)
    }

    console.log(`[n8n] Post ${postData.id} enviado com sucesso para N8N`)

  } catch (error) {
    console.error(`[n8n] Erro enviando post ${postData.id} para N8N:`, error)
  }
}