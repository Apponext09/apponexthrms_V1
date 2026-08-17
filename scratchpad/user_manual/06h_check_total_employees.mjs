import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/employees', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  const t = await page.innerText('body');
  const m = t.match(/Showing \d+ to \d+ of \d+ employees/);
  console.log('TOTAL EMPLOYEES LINE:', m ? m[0] : 'not found');

  // now go to assign slab and check select options properly (it's a <select>)
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("Assign Slab")').first().click();
  await page.waitForTimeout(1800);

  const selects = await page.$$eval('select', els => els.map(e => ({ value: e.value, options: Array.from(e.options).map(o=>o.textContent) })));
  console.log('SELECTS ON ASSIGN SLAB TAB:', JSON.stringify(selects, null, 1));

  // find the specific status select (has Unassigned/Assigned options)
  const statusSelect = page.locator('select').filter({ has: page.locator('option:has-text("Assigned Only")') }).first();
  await statusSelect.selectOption({ label: '✓ Assigned Only' }).catch(async e=>{ console.log('err select assigned', e.message); });
  await page.waitForTimeout(1500);
  let t2 = await page.innerText('body');
  console.log('=== ASSIGNED ONLY RESULT ===');
  console.log(t2.slice(t2.indexOf('EMPLOYEE DETAILS')-100, t2.indexOf('EMPLOYEE DETAILS')+2000));

} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
