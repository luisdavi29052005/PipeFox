import { Page, ElementHandle } from 'playwright';
import { upsertLead } from '../api/leads.js';
import { sendToN8n } from '../services/n8n.service.js';

const POST_SELECTOR = 'div[data-pagelet="FeedUnit_0"], article[data-ft], div[role="article"]';

interface WorkflowNode {
  id: string;
  workflow_id: string;
  group_url: string;
  group_name: string;
  prompt?: string;
  keywords?: string[];
  is_active: boolean;
}

interface ShotMeta {
  id: string;
  url: string;
  timestamp: string;
  group_name: string;
  node_id: string;
}

// Util para aguardar network idle
async function waitNetworkIdle(page: Page, idleMs = 800) {
  return page.waitForLoadState('networkidle', { timeout: idleMs + 5_000 });
}

async function makeShotMeta(element: ElementHandle, nodeId: string): Promise<ShotMeta> {
  // Extrai URL do post e outros metadados
  const url = await element.evaluate(el => {
    const link = el.querySelector('a[href*="/posts/"], a[href*="/groups/"]');
    return link ? link.getAttribute('href') : window.location.href;
  });
  
  return {
    id: `shot_${nodeId}_${Date.now()}`,
    url: url || '',
    timestamp: new Date().toISOString(),
    group_name: '',
    node_id: nodeId
  };
}

export async function collectShots(page: Page, node: WorkflowNode, webhookUrl?: string) {
  const collected: { data: ShotMeta; png: Buffer }[] = [];
  const seen = new Set<string>();
  let emptyCycles = 0;
  let scrollDelay = 1_000;      // começa suave

  while (emptyCycles < 5) {
    // 1) aguarda novos posts ou idle total
    const prevCount = await page.locator(POST_SELECTOR).count();
    await waitNetworkIdle(page);                // ← bloqueia requisições pendentes
    await page.waitForTimeout(300);             // garante pintura
    const newCount = await page.locator(POST_SELECTOR).count();

    // 2) se nada novo, faz scroll e aumenta delay (back-off)
    if (newCount === prevCount) {
      emptyCycles++;
      await page.mouse.wheel(0, page.viewportSize()?.height ?? 800);
      await page.waitForTimeout(scrollDelay);
      scrollDelay = Math.min(scrollDelay + 700, 4_000);
      continue;
    }

    emptyCycles = 0;           // reset
    scrollDelay = 1_000;       // reset

    // 3) processa apenas os posts ainda sem atributo
    for (const el of await page.locator(`${POST_SELECTOR}:not([data-pipefox])`).elementHandles()) {
      await el.evaluate(n => n.setAttribute('data-pipefox', 'done'));

      if (!(await el.isVisible())) continue;
      await el.scrollIntoViewIfNeeded().catch(() => {});
      const png = await el.screenshot({ type: 'png' });
      const meta = await makeShotMeta(el, node.id);
      if (seen.has(meta.id)) continue;

      const lead = await upsertLead(node.id, meta.url);
      if (!lead) continue;

      // Envia para n8n para análise
      if (webhookUrl) {
        await sendToN8n(lead.id, png, webhookUrl, node.prompt || '');
      }

      seen.add(meta.id);
      collected.push({ data: meta, png });
      console.log(`[collect] shot ${meta.id} - enviado para n8n`);
    }
  }

  return collected;
}

export async function postComment(page: Page, postUrl: string, commentText: string): Promise<void> {
    try {
        console.log(`[actions] Navegando para ${postUrl} para comentar.`);
        await page.goto(postUrl, { waitUntil: 'networkidle' });

        // Localiza a área de comentário. O seletor pode precisar de ajuste.
        const commentBoxSelector = 'div[aria-label="Escrever um comentário"], div[aria-label="Write a comment"]';
        await page.waitForSelector(commentBoxSelector);

        const commentBox = page.locator(commentBoxSelector).first();
        await commentBox.click();
        await commentBox.fill(commentText);

        // Aguarda um pouco para a UI reagir
        await page.waitForTimeout(1000);

        // Pressiona Enter para enviar
        await page.keyboard.press('Enter');

        console.log(`[actions] Comentário enviado com sucesso.`);
        await page.waitForTimeout(5000); // Espera para garantir o envio

    } catch (error) {
        console.error(`[actions] Falha ao postar comentário em ${postUrl}:`, error);
        throw error;
    }
}