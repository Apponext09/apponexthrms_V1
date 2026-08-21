import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Slabs & Statutory Rules")').first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SS + '05a-slabs-list.png', fullPage: true });
  const t = await page.innerText('body');
  console.log('=== SLABS PAGE ===');
  console.log(t.slice(t.indexOf('Slabs'), t.indexOf('Slabs')+3000));
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
