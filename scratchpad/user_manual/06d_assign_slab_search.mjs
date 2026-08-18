import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("Assign Slab")').first().click();
  await page.waitForTimeout(1800);

  // look for a search input on this tab
  const inputs = await page.$$eval('input', els => els.map(e => ({placeholder:e.placeholder, type:e.type})));
  console.log('INPUTS ON ASSIGN SLAB TAB:', JSON.stringify(inputs));

  const searchBox = page.locator('input[placeholder*="Search" i]').first();
  if (await searchBox.count() > 0) {
    await searchBox.fill('Aarav');
    await page.waitForTimeout(1200);
  }
  await page.screenshot({ path: SS + '06e-assign-slab-search-aarav.png', fullPage: true });
  const t = await page.innerText('body');
  console.log(t.slice(t.indexOf('EMPLOYEE DETAILS')-100, t.indexOf('EMPLOYEE DETAILS')+1500));
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
