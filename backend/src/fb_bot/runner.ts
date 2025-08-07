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
// Removido o limite para permitir maior paralelismo

export async function startRunner(config: WorkflowConfig) {
  const { id: workflowId } = config;
  if (runningWorkflows.get(workflowId)) {
    console.log(`[runner] Workflow ${workflowId} já está rodando, ignorando.`);
    return;
  }
  
  runningWorkflows.set(workflowId, true);
  console.log(`[runner] Iniciando workflow ${workflowId} com ${config.nodes.length} grupos`);

  try {
    // Processa todos os grupos em paralelo sem limite rígido
    const results = await Promise.allSettled(
      config.nodes.map(node => processGroupNode(config, node))
    );
    
    // Log dos resultados
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`[runner] Workflow ${workflowId}: ${successful} grupos processados com sucesso, ${failed} falharam.`);
    
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
  console.log(`[runner] Iniciando processamento do grupo: ${node.group_name}`);
  let context: BrowserContext | null = null;

  try {
    const { data: account } = await supabase
      .from('accounts')
      .select('user_id')
      .eq('id', config.account_id)
      .single();

    if (!account) throw new Error('Conta não encontrada');

    // Cada grupo abre seu próprio contexto/navegador independente
    context = await openContextForAccount(account.user_id, config.account_id);
    const page = await context.newPage();
    
    console.log(`[runner] Abrindo ${node.group_url} para ${node.group_name}`);
    await page.goto(node.group_url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const posts = await collectPosts(page, node);
    console.log(`[runner] ${posts.length} posts encontrados em ${node.group_name}`);

    // Processa posts em paralelo também
    if (posts.length > 0) {
      await Promise.allSettled(
        posts.map(post => processPost(post.data, post.screenshot, config))
      );
    }
    
    console.log(`[runner] Grupo ${node.group_name} processado com sucesso`);
    
  } catch (error) {
    console.error(`[runner] Falha ao processar o grupo ${node.group_name}:`, error);
    throw error; // Re-throw para que Promise.allSettled capture
  } finally {
    if (context) {
      try {
        await context.close();
        console.log(`[runner] Contexto fechado para ${node.group_name}`);
      } catch (closeError) {
        console.error(`[runner] Erro ao fechar contexto para ${node.group_name}:`, closeError);
      }
    }
  }
}

async function collectPosts(page: Page, node: WorkflowNode): Promise<{ data: PostData; screenshot: Buffer }[]> {
  const collectedPosts: { data: PostData; screenshot: Buffer }[] = [];
  const seenUrls = new Set<string>();

  console.log(`[collectPosts] Aguardando feed aparecer para ${node.group_name}...`);
  
  // Aguarda o contêiner principal do feed aparecer
  await page.waitForSelector('div[role="feed"]', { timeout: 30000 });
  
  console.log(`[collectPosts] Feed encontrado, iniciando coleta de posts...`);

  for (let i = 0; i < 5; i++) {
    console.log(`[collectPosts] Iteração ${i + 1}/5 - Buscando posts...`);
    
    // Busca posts individuais dentro do feed usando o novo seletor
    const elements = await page.locator('div[role="feed"] > div[data-visualcompletion="ignore-dynamic"]').all();
    
    console.log(`[collectPosts] Encontrados ${elements.length} elementos de post na iteração ${i + 1}`);
    
    for (const el of elements) {
      try {
        // Garante que o elemento esteja visível na tela
        await el.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        
        const postData = await extractPostData(el, node.id);
        if (postData && !seenUrls.has(postData.url) && isRelevant(postData, node.keywords || [])) {
          seenUrls.add(postData.url);
          console.log(`[collectPosts] Post relevante encontrado: ${postData.author} - ${postData.url}`);
          
          const screenshot = await el.screenshot();
          collectedPosts.push({ data: postData, screenshot });
        }
      } catch (error) {
        console.log(`[collectPosts] Erro ao processar elemento de post:`, error);
        continue;
      }
    }
    
    // Nova lógica de scroll mais robusta
    const previousHeight = await page.evaluate(() => document.body.scrollHeight);
    
    // Rola até o final da página
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // Aguarda novos posts carregarem
    await page.waitForTimeout(3000);
    
    // Verifica se novos conteúdos foram carregados
    const newHeight = await page.evaluate(() => document.body.scrollHeight);
    if (newHeight === previousHeight) {
      console.log(`[collectPosts] Não há mais conteúdo para carregar. Finalizando...`);
      break;
    }
  }
  
  console.log(`[collectPosts] Coleta finalizada. Total de posts coletados: ${collectedPosts.length}`);
  return collectedPosts;
}

async function extractPostData(el: Locator, nodeId: string): Promise<Omit<PostData, 'node_id'> | null> {
    try {
        // Novos seletores mais robustos para o autor
        const authorSelectors = [
            'h3 a',
            'h4 a', 
            'strong a',
            'a[role="link"]:has(span)',
            'a[role="link"] span',
            'span.x193iq5w.xeuugli'
        ];
        
        let author = null;
        for (const selector of authorSelectors) {
            try {
                const authorEl = el.locator(selector).first();
                const authorText = await authorEl.textContent({ timeout: 2000 });
                if (authorText && authorText.trim() && !authorText.includes('Facebook')) {
                    author = authorText.trim();
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        // Novos seletores para o texto do post
        const textSelectors = [
            '[data-ad-preview="message"]',
            'div[dir="auto"]',
            'div[data-ad-preview="message"] div[dir="auto"]',
            '.x193iq5w.xeuugli.x13faqbe.x1vvkbs.x1xmvt09.x1lliihq.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.xudqn12.x3x7a5m.x6prxxf.xvq8zen.xo1l8bm.xzsf02u'
        ];
        
        let text = null;
        for (const selector of textSelectors) {
            try {
                const textEl = el.locator(selector).first();
                const textContent = await textEl.textContent({ timeout: 2000 });
                if (textContent && textContent.trim()) {
                    text = textContent.trim();
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        // Novos seletores para o link do post
        const linkSelectors = [
            'a[href*="/posts/"]',
            'a[href*="/permalink/"]',
            'a:has(span[id^="jsc_c_"])',
            'a[href*="/videos/"]',
            'a[href*="/photo/"]'
        ];
        
        let href = null;
        for (const selector of linkSelectors) {
            try {
                const linkEl = el.locator(selector).first();
                const linkHref = await linkEl.getAttribute('href', { timeout: 2000 });
                if (linkHref) {
                    href = linkHref;
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        // Validação mais flexível - autor e texto são obrigatórios, link é preferencial
        if (!author || !text) {
            console.log(`[extractPostData] Dados insuficientes - Author: ${!!author}, Text: ${!!text}, Link: ${!!href}`);
            return null;
        }
        
        // Se não tiver link, gera um ID baseado no conteúdo
        let url = href ? (href.startsWith('http') ? href : `https://facebook.com${href}`) : '';
        let id = '';
        
        if (url) {
            const idMatch = url.match(/(?:posts|permalink|videos|photo)\/(\d+)/);
            id = idMatch ? idMatch[1] : Date.now().toString();
        } else {
            // Gera ID único baseado no hash do conteúdo
            id = Buffer.from(`${author}-${text.substring(0, 50)}-${Date.now()}`).toString('base64').substring(0, 10);
            url = `https://facebook.com/post/${id}`;
        }

        console.log(`[extractPostData] Post extraído com sucesso - ID: ${id}, Author: ${author}, URL: ${url}`);
        
        return { 
            id, 
            author, 
            text, 
            url, 
            timestamp: new Date().toISOString() 
        };
    } catch (error) {
        console.log(`[extractPostData] Erro na extração:`, error);
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