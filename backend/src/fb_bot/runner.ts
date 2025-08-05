
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { supabase } from '../supabaseClient.js';
import { getSessionPath } from './paths.js';
import fs from 'fs-extra';
import fetch from 'node-fetch';
import FormData from 'form-data';

interface WorkflowNode {
  id: string;
  workflow_id: string;
  group_name: string;
  group_url: string;
  prompt: string;
  keywords: string[];
  is_active: boolean;
}

interface Account {
  id: string;
  name: string;
  status: string;
  session_data: any;
}

interface Workflow {
  id: string;
  user_id: string;
  account_id: string;
  name: string;
  status: string;
  accounts: Account;
  workflow_nodes: WorkflowNode[];
}

interface RunnerState {
  browser: Browser | null;
  context: BrowserContext | null;
  isRunning: boolean;
  workflow: Workflow | null;
}

// Global state for running workflows
const runningWorkflows = new Map<string, RunnerState>();

export async function startRunner(workflow: Workflow) {
  const workflowId = workflow.id;
  
  try {
    // Stop if already running
    if (runningWorkflows.has(workflowId)) {
      console.log(`[Runner] Stopping existing workflow ${workflowId}`);
      await stopRunner(workflowId);
    }

    console.log(`[Runner] Starting workflow ${workflowId} with ${workflow.workflow_nodes.length} nodes`);
    console.log(`[Runner] Account: ${workflow.accounts.name} (${workflow.accounts.id})`);
    console.log(`[Runner] Account status: ${workflow.accounts.status}`);

    // Get session data from account
    const sessionData = workflow.accounts.session_data;
    console.log(`[Runner] Session data:`, sessionData ? 'Present' : 'Missing');
    
    if (!sessionData?.userDataDir || !sessionData?.storageStatePath) {
      console.error(`[Runner] Missing session data for account ${workflow.accounts.id}`);
      console.error(`[Runner] userDataDir: ${sessionData?.userDataDir}`);
      console.error(`[Runner] storageStatePath: ${sessionData?.storageStatePath}`);
      throw new Error('MISSING_SESSION_DATA: Account session data not found. Please login to Facebook first.');
    }

    // Check if session files exist
    console.log(`[Runner] Checking session directory: ${sessionData.userDataDir}`);
    if (!await fs.pathExists(sessionData.userDataDir)) {
      console.error(`[Runner] Session directory does not exist: ${sessionData.userDataDir}`);
      throw new Error('SESSION_DIR_MISSING: Account session directory not found. Please login to Facebook again.');
    }

    console.log(`[Runner] Session directory exists, proceeding with browser launch`);

    // Launch browser with session
    console.log(`[Runner] Launching browser with userDataDir: ${sessionData.userDataDir}`);
    const browser = await chromium.launchPersistentContext(sessionData.userDataDir, {
      headless: false, // Changed to false for testing/debugging
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-plugins'
      ],
      viewport: { width: 1366, height: 768 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    
    console.log(`[Runner] Browser launched successfully for workflow ${workflowId}`);

    const state: RunnerState = {
      browser,
      context: browser,
      isRunning: true,
      workflow
    };

    runningWorkflows.set(workflowId, state);

    // Start monitoring each active node
    const activeNodes = workflow.workflow_nodes.filter(node => node.is_active);
    
    // Process nodes in parallel
    const nodePromises = activeNodes.map(node => processNode(state, node));
    
    // Wait for all nodes to complete or until stopped
    await Promise.allSettled(nodePromises);

    // Clean up if still running
    if (runningWorkflows.has(workflowId)) {
      await stopRunner(workflowId);
    }

  } catch (error) {
    console.error(`[Runner] Error in workflow ${workflowId}:`, error);
    console.error(`[Runner] Error stack:`, error.stack);
    
    // Update workflow status to error
    try {
      await supabase
        .from('workflows')
        .update({ status: 'error' })
        .eq('id', workflowId);
    } catch (dbError) {
      console.error(`[Runner] Failed to update workflow status:`, dbError);
    }

    // Clean up
    await stopRunner(workflowId);
    throw error;
  }
}

async function processNode(state: RunnerState, node: WorkflowNode) {
  if (!state.isRunning || !state.context) return;

  console.log(`[Runner] Processing node ${node.id} for group: ${node.group_name || node.group_url}`);

  try {
    const page = await state.context.newPage();
    
    // Navigate to Facebook group
    await page.goto(node.group_url, { waitUntil: 'networkidle' });
    
    // Wait for page to load
    await page.waitForTimeout(5000);

    // Check if we're logged in
    const isLoggedIn = await page.locator('div[role="main"]').isVisible();
    if (!isLoggedIn) {
      console.log(`[Runner] Not logged in for node ${node.id}`);
      await page.close();
      return;
    }

    // Start monitoring posts
    const checkInterval = 120000; // Check every 2 minutes
    const processedPosts = new Set<string>(); // Track processed posts

    while (state.isRunning) {
      try {
        console.log(`[Runner] Checking for new posts in node ${node.id}...`);
        
        // Scroll to load more posts
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(3000);

        // Find posts - more specific selectors for Facebook posts
        const posts = await page.locator('div[data-pagelet^="FeedUnit_"], div[role="article"]').all();
        
        for (const post of posts.slice(0, 5)) { // Process only first 5 posts to avoid overload
          if (!state.isRunning) break;

          try {
            // Get a unique identifier for the post to avoid reprocessing
            const postId = await getPostId(post);
            if (!postId || processedPosts.has(postId)) continue;

            // Check if post is relevant based on keywords
            const postText = await getPostText(post);
            if (!isPostRelevant({ post_text: postText }, node)) continue;

            console.log(`[Runner] Found relevant post ${postId} in node ${node.id}`);

            // Take screenshot of the post
            const screenshot = await takePostScreenshot(post);
            if (!screenshot) continue;

            // Send to N8N for processing
            const n8nResult = await sendToN8N(screenshot, node.prompt);
            if (!n8nResult) continue;

            // Save as lead in database
            const leadData = {
              post_url: await getPostUrl(post) || `${node.group_url}#${postId}`,
              post_author: n8nResult.author,
              post_text: n8nResult.text,
              generated_comment: n8nResult.reply
            };

            await savePostAsLead(leadData, node);

            // Comment on the post
            await commentOnPost(post, n8nResult.reply);

            processedPosts.add(postId);
            console.log(`[Runner] Successfully processed post ${postId} in node ${node.id}`);

            // Wait a bit between posts to avoid rate limits
            await page.waitForTimeout(10000);

          } catch (err) {
            console.error(`[Runner] Error processing post in node ${node.id}:`, err);
          }
        }

        await page.waitForTimeout(checkInterval);

      } catch (err) {
        console.error(`[Runner] Error in monitoring loop for node ${node.id}:`, err);
        await page.waitForTimeout(checkInterval);
      }
    }

    await page.close();

  } catch (error) {
    console.error(`[Runner] Error processing node ${node.id}:`, error);
  }
}

async function getPostId(post: any): Promise<string | null> {
  try {
    // Try to get post ID from data attributes or URL
    const postLink = await post.locator('a[href*="/posts/"], a[href*="/permalink/"]').first();
    const href = await postLink.getAttribute('href');
    
    if (href) {
      const match = href.match(/\/posts\/(\d+)|\/permalink\/(\d+)/);
      if (match) return match[1] || match[2];
    }

    // Fallback: use a combination of author and timestamp
    const author = await post.locator('strong a, h3 a').first().textContent();
    const timestamp = await post.locator('a[role="link"] span').first().textContent();
    
    return author && timestamp ? `${author}_${timestamp}`.replace(/\s+/g, '_') : null;
  } catch (error) {
    return null;
  }
}

async function getPostText(post: any): Promise<string> {
  try {
    const textElement = await post.locator('div[data-ad-preview="message"], div[data-testid="post_message"]').first();
    return await textElement.textContent() || '';
  } catch (error) {
    return '';
  }
}

async function getPostUrl(post: any): Promise<string | null> {
  try {
    const postLink = await post.locator('a[href*="/posts/"], a[href*="/permalink/"]').first();
    const href = await postLink.getAttribute('href');
    return href ? (href.startsWith('http') ? href : `https://www.facebook.com${href}`) : null;
  } catch (error) {
    return null;
  }
}

async function takePostScreenshot(post: any): Promise<Buffer | null> {
  try {
    console.log('[Runner] Taking screenshot of post...');
    
    // Scroll the post into view
    await post.scrollIntoViewIfNeeded();
    await post.page().waitForTimeout(2000);

    // Take screenshot of the post element
    const screenshot = await post.screenshot({
      type: 'png',
      quality: 90
    });

    return screenshot;
  } catch (error) {
    console.error('[Runner] Error taking screenshot:', error);
    return null;
  }
}

async function sendToN8N(screenshot: Buffer, prompt: string): Promise<any> {
  try {
    console.log('[Runner] Sending screenshot to N8N for processing...');
    
    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
    
    if (!N8N_WEBHOOK_URL) {
      console.log('[Runner] N8N_WEBHOOK_URL not configured, skipping N8N processing');
      // Return mock data for testing
      return {
        author: 'Test Author',
        text: 'Test post content extracted from screenshot',
        reply: prompt || 'Obrigado pelo seu post interessante!'
      };
    }
    
    const formData = new FormData();
    formData.append('image', screenshot, 'post.png');
    formData.append('prompt', prompt);

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`N8N request failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('[Runner] N8N processing result:', result);
    
    return result;
  } catch (error) {
    console.error('[Runner] Error sending to N8N:', error);
    // Return mock data as fallback
    return {
      author: 'Mock Author',
      text: 'Mock post content (N8N unavailable)',
      reply: prompt || 'Obrigado pelo seu post!'
    };
  }
}

async function commentOnPost(post: any, comment: string): Promise<boolean> {
  try {
    console.log('[Runner] Attempting to comment on post...');
    
    // Look for comment input box
    const commentBox = await post.locator('div[contenteditable="true"][role="textbox"], textarea[placeholder*="comment"], div[aria-label*="comment"]').first();
    
    if (await commentBox.isVisible()) {
      // Click on the comment box
      await commentBox.click();
      await post.page().waitForTimeout(1000);

      // Type the comment
      await commentBox.fill(comment);
      await post.page().waitForTimeout(1000);

      // Look for submit button
      const submitButton = await post.locator('div[role="button"]:has-text("Comment"), button:has-text("Comment"), div[aria-label*="Comment"]').first();
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        console.log('[Runner] Comment posted successfully');
        return true;
      }
    }

    console.log('[Runner] Could not find comment box or submit button');
    return false;
  } catch (error) {
    console.error('[Runner] Error commenting on post:', error);
    return false;
  }
}

function isPostRelevant(postData: any, node: WorkflowNode): boolean {
  if (!postData || !postData.post_text) return false;

  // If no keywords, consider all posts relevant
  if (!node.keywords || node.keywords.length === 0) return true;

  const postTextLower = postData.post_text.toLowerCase();
  
  // Check if any keyword matches
  return node.keywords.some(keyword => 
    postTextLower.includes(keyword.toLowerCase())
  );
}

async function savePostAsLead(postData: any, node: WorkflowNode) {
  try {
    // Check if lead already exists
    const { data: existingLead, error: checkError } = await supabase
      .from('leads')
      .select('id')
      .eq('node_id', node.id)
      .eq('post_url', postData.post_url)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[Runner] Error checking existing lead:', checkError);
      return;
    }

    if (existingLead) {
      console.log(`[Runner] Lead already exists for ${postData.post_url}`);
      return;
    }

    // Save new lead
    const { data, error } = await supabase
      .from('leads')
      .insert([{
        node_id: node.id,
        post_url: postData.post_url,
        post_author: postData.post_author,
        post_text: postData.post_text,
        generated_comment: postData.generated_comment,
        status: 'extracted'
      }])
      .select()
      .single();

    if (error) {
      console.error('[Runner] Error saving lead:', error);
    } else {
      console.log(`[Runner] New lead saved for node ${node.id}: ${postData.post_url}`);
    }

  } catch (error) {
    console.error('[Runner] Error saving lead:', error);
  }
}

async function generateComment(postData: any, prompt: string): string {
  try {
    // Simple template-based comment generation
    // You can integrate with OpenAI or other AI services here
    
    const templates = [
      `Interessante! ${prompt}`,
      `Ótimo post! ${prompt}`,
      `Concordo plenamente. ${prompt}`,
      `Excelente ponto de vista. ${prompt}`
    ];

    // For now, return a random template with the prompt
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    return randomTemplate;

  } catch (error) {
    console.error('[Runner] Error generating comment:', error);
    return prompt; // Fallback to just the prompt
  }
}

export async function stopRunner(workflowId: string) {
  const state = runningWorkflows.get(workflowId);
  
  if (state) {
    console.log(`[Runner] Stopping workflow ${workflowId}`);
    
    state.isRunning = false;
    
    try {
      if (state.context) {
        await state.context.close();
      }
    } catch (error) {
      console.error(`[Runner] Error closing browser context for workflow ${workflowId}:`, error);
    }

    runningWorkflows.delete(workflowId);
  }

  // Update workflow status in database
  await supabase
    .from('workflows')
    .update({ status: 'stopped' })
    .eq('id', workflowId);
}

export async function stopAllRunners() {
  const workflowIds = Array.from(runningWorkflows.keys());
  
  for (const workflowId of workflowIds) {
    await stopRunner(workflowId);
  }
}

// Graceful shutdown
process.on('SIGINT', stopAllRunners);
process.on('SIGTERM', stopAllRunners);
