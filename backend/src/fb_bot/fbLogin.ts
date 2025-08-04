import { chromium } from 'playwright';

export async function openLoginWindow() {
  const userDataDir = process.env.CHROME_USER_DATA_DIR!;
  const headless = String(process.env.HEADLESS || 'false').toLowerCase() === 'true';

  const context = await chromium.launchPersistentContext(userDataDir, { headless });
  const page = await context.newPage();

  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded' });

  await new Promise<void>((resolve) => {
    context.on('close', () => resolve());
  });
}
