import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://google.com');
  await page.waitForTimeout(3000); // Espera 3 segundos
  await browser.close();
})();
