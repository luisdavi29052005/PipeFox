import type { BrowserContext } from 'playwright';
import fs from 'fs-extra';
import path from 'path';

type ScrapeOpts = {
  workflow_id: string;
  group_url: string;
  webhook_url?: string;
  keywords?: string[];
  max_posts?: number;
  scroll_steps?: number;
};

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function waitForFeed(page) {
  await page.waitForSelector('[role="feed"], [data-pagelet*="GroupFeed"]', { timeout: 20000 }).catch(() => {});
}

async function incrementalScroll(page, steps: number) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, 1200);
    await sleep(700 + Math.random() * 600);
  }
}

function hasKeyword(text: string, keywords?: string[]) {
  if (!keywords || keywords.length === 0) return true;
  const t = (text || '').toLowerCase();
  return keywords.some(k => t.includes(String(k).toLowerCase()));
}

async function sendToWebhook(webhookUrl: string, pngPath: string, meta: any) {
  if (!webhookUrl) return;
  const buf = await fs.readFile(pngPath);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'image/png' }), path.basename(pngPath));
  form.append('meta', JSON.stringify(meta));
  const resp = await fetch(webhookUrl, { method: 'POST', body: form });
  console.log(`[webhook] status=${resp.status}`);
}

export async function scrapeGroupOnce(context: BrowserContext, opts: ScrapeOpts) {
  const {
    workflow_id, group_url, webhook_url, keywords,
    max_posts = Number(process.env.MAX_POSTS || 5),
    scroll_steps = Number(process.env.SCROLL_STEPS || 6),
  } = opts;

  const page = await context.newPage();
  try {
    await page.goto(group_url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForFeed(page);
    await incrementalScroll(page, scroll_steps);

    const posts = page.locator('[role="article"]');
    const total = await posts.count();

    const outDir = path.resolve(process.cwd(), 'artifacts', workflow_id);
    await fs.ensureDir(outDir);

    let sent = 0;
    for (let i = 0; i < Math.min(total, max_posts); i++) {
      const item = posts.nth(i);
      let text = '';
      try { text = await item.innerText({ timeout: 2000 }); } catch {}

      if (!hasKeyword(text, keywords)) continue;

      const file = path.join(outDir, `${Date.now()}_${i}.png`);
      await item.screenshot({ path: file });

      const meta = { workflow_id, group_url, index: i, text_snippet: text?.slice(0, 500) || '', captured_at: new Date().toISOString() };
      console.log(`[scraper] screenshot -> ${file}`);

      if (webhook_url) await sendToWebhook(webhook_url, file, meta);
      sent++;
    }

    console.log(`[scraper] total=${total} enviados=${sent}`);
  } finally {
    await page.close().catch(() => {});
  }
}
