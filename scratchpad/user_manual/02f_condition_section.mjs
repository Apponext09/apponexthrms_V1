import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1100 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("Components Catalog")').first().click();
  await page.waitForTimeout(1500);
  await page.locator('text=Basic').first().click();
  await page.waitForTimeout(1000);
  const row = page.locator('tr', { hasText: 'Basic 50%' });
  await row.locator('button, a').first().click();
  await page.waitForTimeout(1500);

  // scroll the right panel down to reveal Condition Setting
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(800);
  await page.screenshot({ path: SS + '02g-condition-setting-section.png', fullPage: false });

  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(800);
  await page.screenshot({ path: SS + '02h-condition-setting-section2.png', fullPage: false });

  // Full page screenshot too
  await page.screenshot({ path: SS + '02i-full-edit-form.png', fullPage: true });

} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
