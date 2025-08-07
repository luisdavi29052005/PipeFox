import { BrowserContext, Page, Locator } from 'playwright';
import pLimit from 'p-limit';
import { supabase } from '../supabaseClient';
import { openContextForAccount } from './context';
import { sendToN8n } from '../services/n8n.service'; // Criaremos este serviço

// Tipos (mantidos do seu código original)
interface WorkflowNode {
  id: string;
  group_url: string;
  group_name: string;
  is_active: boolean;
  prompt?: string;
  keywords?: string[];
}

export interface WorkflowConfig {
  id: string;
  account_id: string;
  webhook_url?: string;
  nodes: WorkflowNode[];
}

interface PostData {
  id: string;
  author: string;
  text: string;
  url: string;
  timestamp: string;
  node_id: string;
}

const runningWorkflows = new Map<string, boolean>();
const limit = pLimit(3);

export async function startRunner(config: WorkflowConfig) {
  const { id: workflowId } = config;
  if (runningWorkflows.get(workflowId)) return;
  runningWorkflows.set(workflowId, true);
  console.log(`[runner] Iniciando workflow ${workflowId}`);

  try {
    await Promise.allSettled(
      config.nodes.map(node => limit(() => processGroupNode(config, node)))
    );
  } catch (err) {
    console.error(`[runner] Erro crítico no workflow ${workflowId}:`, err);
  } finally {
    runningWorkflows.delete(workflowId);
    console.log(`[runner] Workflow ${workflowId} finalizado.`);
  }
}

export async function stopRunner(workflowId: string) {
  runningWorkflows.delete(workflowId);
  await supabase.from('workflows').update({ status: 'stopped' }).eq('id', workflowId);
  console.log(`[runner] Workflow ${workflowId} parado.`);
}

async function processGroupNode(config: WorkflowConfig, node: WorkflowNode) {
  console.log(`[runner] Processando grupo: ${node.group_name}`);
  let context: BrowserContext | null = null;

  try {
    const { data: account } = await supabase
      .from('accounts')
      .select('user_id')
      .eq('id', config.account_id)
      .single();

    if (!account) throw new Error('Conta não encontrada');

    context = await openContextForAccount(account.user_id, config.account_id, true);
    const page = await context.newPage();
    await page.goto(node.group_url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const posts = await collectPosts(page, node);
    console.log(`[runner] ${posts.length} posts encontrados em ${node.group_name}`);

    for (const post of posts) {
      await processPost(post.data, post.screenshot, config);
    }
  } catch (error) {
     console.error(`[runner] Falha ao processar o grupo ${node.group_name}:`, error)
  }
  finally {
    if (context) await context.close();
  }
}

async function collectPosts(page: Page, node: WorkflowNode): Promise<{ data: PostData; screenshot: Buffer }[]> {
  const collectedPosts: { data: PostData; screenshot: Buffer }[] = [];
  const seenUrls = new Set<string>();

  await page.waitForSelector('[data-pagelet^="FeedUnit"]');

  for (let i = 0; i < 5; i++) { // Rola a página 5 vezes
    const elements = await page.locator('[data-pagelet^="FeedUnit"]').all();
    for (const el of elements) {
      const postData = await extractPostData(el, node.id);
      if (postData && !seenUrls.has(postData.url) && isRelevant(postData, node.keywords || [])) {
        seenUrls.add(postData.url);
        const screenshot = await el.screenshot();
        collectedPosts.push({ data: postData, screenshot });
      }
    }
    await page.evaluate(() => window.scrollBy(0, 2000));
    await page.waitForTimeout(2000);
  }
  return collectedPosts;
}

async function extractPostData(el: Locator, nodeId: string): Promise<Omit<PostData, 'node_id'> | null> {
    try {
        const authorEl = el.locator('h3 a, h4 a, a[role="link"][aria-label]');
        const author = await authorEl.first().textContent();
        
        const textEl = el.locator('[data-ad-preview="message"], div[dir="auto"]').first();
        const text = await textEl.textContent();

        const linkEl = el.locator('a[href*="/posts/"], a[href*="/permalink/"]').first();
        const href = await linkEl.getAttribute('href');
        
        if (!href || !author || !text) return null;

        const url = href.startsWith('http') ? href : `https://facebook.com${href}`;
        const idMatch = url.match(/(?:posts|permalink|videos|photo)\/(\d+)/);
        const id = idMatch ? idMatch[1] : Date.now().toString();

        return { id, author, text, url, timestamp: new Date().toISOString() };
    } catch {
        return null;
    }
}


function isRelevant(post: Omit<PostData, 'node_id'>, keywords: string[]): boolean {
  if (!keywords.length) return true;
  const content = `${post.text} ${post.author}`.toLowerCase();
  return keywords.some(k => content.includes(k.toLowerCase()));
}

async function processPost(postData: PostData, screenshot: Buffer, config: WorkflowConfig) {
  // 1. Salva o lead no banco com status inicial
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      node_id: postData.node_id,
      post_url: postData.url,
      post_author: postData.author,
      post_text: postData.text,
      status: 'pending_analysis'
    })
    .select()
    .single();

  if (leadError) {
    console.error(`[runner] Erro ao salvar lead para o post ${postData.url}:`, leadError);
    return;
  }

  // 2. Envia para o n8n para análise e geração de comentário
  console.log(`[runner] Enviando post ${postData.url} para análise do n8n.`);
  await sendToN8n(lead.id, screenshot, config.webhook_url);
}