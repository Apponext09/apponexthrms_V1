import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Components Catalog")').first().click();
  await page.waitForTimeout(1000);
  await page.locator('text=Salary Days').first().click();
  await page.waitForTimeout(800);
  const rows = page.locator('table tbody tr');
  await rows.first().locator('button').first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: SS + '03g-module-type-component.png', fullPage: true });
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
