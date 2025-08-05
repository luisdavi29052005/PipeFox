
import { chromium, BrowserContext, Page } from 'playwright'
import { supabase } from '../supabaseClient.js'
import { openContextForAccount } from './context.js'
import pLimit from 'p-limit'

interface WorkflowConfig {
  id: string
  account_id: string
  webhook_url?: string
  keywords: string[]
  nodes: Array<{
    id: string
    group_url: string
    group_name: string
    status: string
  }>
}

interface PostData {
  id: string
  author: string
  text: string
  url: string
  timestamp: string
  screenshot?: string
}

const runningWorkflows = new Map<string, boolean>()
const limit = pLimit(3) // Limit concurrent group processing

export async function startRunner(config: WorkflowConfig) {
  const workflowId = config.id
  
  if (runningWorkflows.get(workflowId)) {
    console.log(`[runner] Workflow ${workflowId} already running`)
    return
  }

  runningWorkflows.set(workflowId, true)
  console.log(`[runner] Starting workflow ${workflowId} with ${config.nodes.length} groups`)

  try {
    // Create workflow run record
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

    // Process all nodes in parallel with concurrency limit
    const results = await Promise.allSettled(
      config.nodes.map(node => 
        limit(() => processGroupNode(config, node, runId))
      )
    )

    // Log results
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    
    console.log(`[runner] Workflow ${workflowId} completed: ${successful} successful, ${failed} failed`)

    // Update workflow run
    if (runId) {
      await supabase
        .from('workflow_runs')
        .update({
          finished_at: new Date().toISOString(),
          status: failed > 0 ? 'partial_success' : 'success',
          posts_processed: successful
        })
        .eq('id', runId)
    }

  } catch (error) {
    console.error(`[runner] Workflow ${workflowId} error:`, error)
    
    // Update workflow status to error
    await supabase
      .from('workflows')
      .update({ status: 'error' })
      .eq('id', workflowId)
      
  } finally {
    runningWorkflows.delete(workflowId)
  }
}

async function processGroupNode(config: WorkflowConfig, node: any, runId?: string) {
  console.log(`[runner] Processing group: ${node.group_name}`)
  
  let context: BrowserContext | null = null
  
  try {
    // Get user data from account
    const { data: account } = await supabase
      .from('accounts')
      .select('session_data, user_id')
      .eq('id', config.account_id)
      .single()

    if (!account?.session_data?.userDataDir) {
      throw new Error('Account session data not found')
    }

    // Open browser context
    context = await openContextForAccount(account.user_id, config.account_id)
    const page = await context.newPage()

    // Navigate to group with retry
    await navigateWithRetry(page, node.group_url)

    // Check if login is required
    await checkAndHandleLogin(page, config.account_id, account.user_id)

    // Scroll and collect posts
    const posts = await collectPosts(page, config.keywords)
    
    console.log(`[runner] Found ${posts.length} relevant posts in ${node.group_name}`)

    // Process each post
    for (const post of posts) {
      await processPost(post, config, node.id, runId)
    }

  } catch (error) {
    console.error(`[runner] Error processing group ${node.group_name}:`, error)
    throw error
  } finally {
    if (context) {
      await context.close()
    }
  }
}

async function navigateWithRetry(page: Page, url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      })
      return
    } catch (error) {
      console.log(`[runner] Navigation attempt ${i + 1} failed:`, error)
      if (i === maxRetries - 1) throw error
      await page.waitForTimeout(2000 * (i + 1)) // Exponential backoff
    }
  }
}

async function checkAndHandleLogin(page: Page, accountId: string, userId: string) {
  try {
    const loginInput = page.locator('input[name="email"]')
    if (await loginInput.isVisible({ timeout: 5000 })) {
      console.log(`[runner] Login required for account ${accountId}`)
      
      // Update account status
      await supabase
        .from('accounts')
        .update({ status: 'login_required' })
        .eq('id', accountId)
        
      throw new Error('Account login expired')
    }
  } catch (error) {
    // Login check timeout is expected for logged in accounts
    if (!error.message.includes('Timeout')) {
      throw error
    }
  }
}

async function collectPosts(page: Page, keywords: string[]): Promise<PostData[]> {
  const posts: PostData[] = []
  const processedUrls = new Set<string>()

  // Scroll and collect posts
  for (let scroll = 0; scroll < 5; scroll++) {
    await page.evaluate(() => window.scrollBy(0, 1000))
    await page.waitForTimeout(2000)

    const postElements = await page.locator('[data-pagelet*="FeedUnit"]').all()
    
    for (const postEl of postElements) {
      try {
        const postData = await extractPostData(postEl)
        if (!postData || processedUrls.has(postData.url)) continue
        
        processedUrls.add(postData.url)
        
        if (isPostRelevant(postData, keywords)) {
          posts.push(postData)
        }
      } catch (error) {
        console.log('[runner] Error extracting post:', error)
      }
    }
  }

  return posts
}

async function extractPostData(postElement: any): Promise<PostData | null> {
  try {
    const author = await postElement.locator('[data-hovercard-user-id]').first().textContent() || 'Unknown'
    const text = await postElement.locator('[data-ad-preview="message"]').textContent() || ''
    const timeElement = await postElement.locator('a[role="link"] abbr').first()
    const timestamp = await timeElement.getAttribute('data-utime') || Date.now().toString()
    
    const linkElement = await postElement.locator('a[href*="/posts/"], a[href*="/groups/"][href*="/permalink/"]').first()
    const href = await linkElement.getAttribute('href')
    const url = href ? `https://facebook.com${href}` : ''

    if (!url) return null

    return {
      id: getPostId(url),
      author: author.trim(),
      text: text.trim(),
      url,
      timestamp
    }
  } catch (error) {
    return null
  }
}

function getPostId(url: string): string {
  const match = url.match(/(?:posts|permalink)\/(\d+)/)
  return match ? match[1] : url.split('/').pop() || 'unknown'
}

function isPostRelevant(post: PostData, keywords: string[]): boolean {
  if (keywords.length === 0) return true
  
  const searchText = `${post.text} ${post.author}`.toLowerCase()
  return keywords.some(keyword => searchText.includes(keyword.toLowerCase()))
}

async function processPost(post: PostData, config: WorkflowConfig, nodeId: string, runId?: string) {
  try {
    // Check if already processed
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('post_url', post.url)
      .eq('workflow_node_id', nodeId)
      .single()

    if (existing) {
      console.log(`[runner] Post already processed: ${post.id}`)
      return
    }

    // Save as lead
    const { data: lead } = await supabase
      .from('leads')
      .insert({
        workflow_node_id: nodeId,
        post_url: post.url,
        post_id: post.id,
        author: post.author,
        content: post.text,
        status: 'captured',
        run_id: runId
      })
      .select()
      .single()

    console.log(`[runner] Saved lead: ${post.author} - ${post.text.substring(0, 50)}...`)

    // Send to webhook if configured
    if (config.webhook_url && lead) {
      await sendToWebhook(config.webhook_url, post, lead.id)
    }

  } catch (error) {
    console.error('[runner] Error processing post:', error)
  }
}

async function sendToWebhook(webhookUrl: string, post: PostData, leadId: string) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Lead-ID': leadId
      },
      body: JSON.stringify({
        post_id: post.id,
        author: post.author,
        text: post.text,
        url: post.url,
        timestamp: post.timestamp,
        lead_id: leadId
      })
    })

    if (response.ok) {
      const result = await response.json()
      console.log(`[runner] Webhook response:`, result)
      
      // Update lead with webhook response
      if (result.author && result.text) {
        await supabase
          .from('leads')
          .update({
            ai_response: result.text,
            ai_author: result.author,
            status: 'processed'
          })
          .eq('id', leadId)
      }
    } else {
      console.error('[runner] Webhook failed:', response.status, response.statusText)
    }
  } catch (error) {
    console.error('[runner] Webhook error:', error)
  }
}

export async function stopRunner(workflowId: string) {
  runningWorkflows.delete(workflowId)
  console.log(`[runner] Stopped workflow ${workflowId}`)
}
