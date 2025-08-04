import { chromium, BrowserContext } from 'playwright';
import { scrapeGroupOnce } from './scraper';

type RunnerWorkflow = {
  id: string;
  account_id: string;
  group_url: string;
  webhook_url?: string;
  keywords?: string[];
};

const runners = new Map<string, { timer: NodeJS.Timeout; context: BrowserContext }>();

function getHeadless() {
  return String(process.env.HEADLESS || 'false').toLowerCase() === 'true';
}

export async function startRunner(wf: RunnerWorkflow) {
  if (runners.has(wf.id)) return;

  const userDataDir = process.env.CHROME_USER_DATA_DIR!;
  const context = await chromium.launchPersistentContext(userDataDir, { headless: getHeadless() });

  const tick = async () => {
    try {
      await scrapeGroupOnce(context, {
        workflow_id: wf.id,
        group_url: wf.group_url,
        webhook_url: wf.webhook_url,
        keywords: wf.keywords || [],
      });
    } catch (e) {
      console.error('[runner] erro:', e);
    }
  };

  await tick();                            // dispara imediatamente
  const timer = setInterval(tick, 60_000); // a cada 60s

  runners.set(wf.id, { timer, context });
  console.log(`[runner] iniciado workflow=${wf.id}`);
}

export async function stopRunner(workflowId: string) {
  const r = runners.get(workflowId);
  if (!r) return;
  clearInterval(r.timer);
  try { await r.context.close(); } catch {}
  runners.delete(workflowId);
  console.log(`[runner] parado workflow=${workflowId}`);
}
