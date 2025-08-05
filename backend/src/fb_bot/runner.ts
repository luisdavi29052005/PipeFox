import { chromium, BrowserContext, Page } from 'playwright'
import pLimit from 'p-limit'
import { supabase } from '../supabaseClient'
import { openContextForAccount } from './context.js'

/************************************************************
 * Types                                                   *
 ***********************************************************/
interface WorkflowNode {
  id: string
  group_url: string
  group_name: string
  is_active: boolean
  prompt?: string
  keywords?: string[]
}

export interface WorkflowConfig {
  id: string
  account_id: string
  webhook_url?: string
  keywords: string[]
  nodes: WorkflowNode[]
}

interface PostData {
  id: string
  author: string
  text: string
  url: string
  timestamp: string
}

/************************************************************
 * Globals                                                 *
 ***********************************************************/
const runningWorkflows = new Map<string, boolean>()
const limit = pLimit(3) // limita até 3 grupos em paralelo

/************************************************************
 * API pública                                             *
 ***********************************************************/
export async function startRunner (config: WorkflowConfig) {
  const { id: workflowId } = config

  if (runningWorkflows.get(workflowId)) {
    console.log(`[runner] Workflow ${workflowId} já está em execução`)
    return
  }
  runningWorkflows.set(workflowId, true)
  console.log(`[runner] Starting workflow ${workflowId} with ${config.nodes.length} groups`)

  // cria registro da execução
  const { data: workflowRun } = await supabase
    .from('workflow_runs')
    .insert({
      workflow_id: workflowId,
      started_at: new Date().toISOString(),
      status: 'running'
    })
    .select()
    .single()
  const runId = workflowRun?.id

  try {
    /* ---------------------------------------------------- */
    /* processa todos os nodes                              */
    /* ---------------------------------------------------- */
    const results = await Promise.allSettled(
      config.nodes.map(node => limit(() => processGroupNode(config, node, runId)))
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`[runner] Workflow ${workflowId} completed: ${successful} success, ${failed} failed`)

    await supabase.from('workflows').update({
      status: failed ? 'partial_success' : 'completed'
    }).eq('id', workflowId)

    if (runId) {
      await supabase.from('workflow_runs').update({
        finished_at: new Date().toISOString(),
        status: failed ? 'partial_success' : 'success',
        posts_processed: successful
      }).eq('id', runId)
    }
  } catch (err) {
    console.error(`[runner] Erro no workflow ${workflowId}:`, err)
    await supabase.from('workflows').update({ status: 'failed' }).eq('id', workflowId)
    if (runId) {
      await supabase.from('workflow_runs').update({
        finished_at: new Date().toISOString(),
        status: 'failed'
      }).eq('id', runId)
    }
  } finally {
    runningWorkflows.delete(workflowId)
  }
}

export async function stopRunner (workflowId: string) {
  runningWorkflows.delete(workflowId)
  await supabase.from('workflows').update({ status: 'stopped' }).eq('id', workflowId)
  console.log(`[runner] Stopped workflow ${workflowId}`)
}

/************************************************************
 * Helpers                                                 *
 ***********************************************************/
async function processGroupNode (config: WorkflowConfig, node: WorkflowNode, runId?: string) {
  console.log(`[runner] Processing group: ${node.group_name}`)
  let context: BrowserContext | null = null

  try {
    // busca session_data
    const { data: account } = await supabase
      .from('accounts')
      .select('session_data, user_id')
      .eq('id', config.account_id)
      .single()

    if (!account?.session_data?.userDataDir) {
      throw new Error('Account session data não encontrada')
    }

    // abre contexto Playwright
    context = await openContextForAccount(account.user_id, config.account_id, /* headless */ false)

    /** detecta fechamento do browser */
    context.browser()?.on('disconnected', async () => {
      console.log('[runner] Browser desconectado — marcando workflow como stopped')
      await supabase.from('workflows').update({ status: 'stopped' }).eq('id', config.id)
    })

    const page = await context.newPage()
    await navigateWithRetry(page, node.group_url)
    await checkAndHandleLogin(page, config.account_id, account.user_id)

    const posts = await collectPosts(page, node.keywords ?? config.keywords)
    console.log(`[runner] Found ${posts.length} relevant posts in ${node.group_name}`)

    // ... aqui você processa cada post (código original omitido para brevidade) ...

  } finally {
    if (context) await context.close()
  }
}

async function navigateWithRetry (page: Page, url: string, max = 3) {
  for (let i = 1; i <= max; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      return
    } catch (err) {
      console.log(`[runner] Navegação falhou (${i}/${max}):`, err.message)
      if (i === max) throw err
      await page.waitForTimeout(1000 * i)
    }
  }
}

async function checkAndHandleLogin (page: Page, accountId: string, userId: string) {
  try {
    const emailInput = page.locator('input[name="email"]')
    if (await emailInput.isVisible({ timeout: 5000 })) {
      console.log('[runner] Login expirado — status login_required')
      await supabase.from('accounts').update({ status: 'login_required' }).eq('id', accountId)
      throw new Error('Login requerido')
    }
  } catch (err) {
    if (!String(err).includes('Timeout')) throw err
  }
}

/**
 * Scroll simples coletando posts — mantive a lógica original, 
 * mas você pode refatorar conforme necessidade.
 */
async function collectPosts (page: Page, keywords: string[]): Promise<PostData[]> {
  const posts: PostData[] = []
  const urls = new Set<string>()

  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, 1200))
    await page.waitForTimeout(1500)

    const elements = await page.locator('[data-pagelet^="FeedUnit"]').all()
    for (const el of elements) {
      const pdata = await extractPost(el)
      if (pdata && !urls.has(pdata.url) && isRelevant(pdata, keywords)) {
        urls.add(pdata.url)
        posts.push(pdata)
      }
    }
  }
  return posts
}

async function extractPost (el: any): Promise<PostData | null> {
  try {
    const author = await el.locator('[data-hovercard-user-id]').first().textContent() || 'Unknown'
    const text = await el.locator('[data-ad-preview="message"]').textContent() || ''
    const linkNode = await el.locator('a[href*="/posts/"], a[href*="/permalink/"]').first()
    const href = await linkNode.getAttribute('href')
    if (!href) return null
    const url = href.startsWith('http') ? href : `https://facebook.com${href}`
    const idMatch = url.match(/(?:posts|permalink)\/(\d+)/)
    const id = idMatch ? idMatch[1] : Date.now().toString()
    return { id, author, text, url, timestamp: Date.now().toString() }
  } catch {
    return null
  }
}

function isRelevant (post: PostData, keywords: string[]): boolean {
  if (!keywords.length) return true
  const content = `${post.text} ${post.author}`.toLowerCase()
  return keywords.some(k => content.includes(k.toLowerCase()))
}
