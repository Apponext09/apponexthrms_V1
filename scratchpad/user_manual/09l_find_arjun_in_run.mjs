import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("Payroll Runs")').first().click();
  await page.waitForTimeout(2000);
  await page.locator('text=View Details').first().click();
  await page.waitForTimeout(2000);

  const filterBox = page.locator('input[placeholder*="Filter employees" i]').first();
  await filterBox.fill('Arjun');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: SS + '09m-run30-arjun-filtered.png', fullPage: true });
  const t = await page.innerText('body');
  console.log(t.slice(t.indexOf('EMPLOYEE'), t.indexOf('EMPLOYEE')+800));
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
