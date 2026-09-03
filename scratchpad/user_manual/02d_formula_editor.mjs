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

  // click the edit pencil icon on the "Basic 50%" row (DERIVED type)
  const row = page.locator('tr', { hasText: 'Basic 50%' });
  await row.locator('button, a').first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SS + '02e-derived-formula-editor.png', fullPage: true });
  const t1 = await page.innerText('body');
  console.log('=== DERIVED (Basic 50%) EDIT FORM ===');
  console.log(t1.slice(t1.lastIndexOf('Payroll Master Settings')));

} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
