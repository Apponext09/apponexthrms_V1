import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();
page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

try {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const inputs = await page.$$eval('input', els => els.map(e => ({type:e.type, value:e.value, placeholder:e.placeholder})));
  console.log('INPUTS:', JSON.stringify(inputs));

  const selects = await page.$$('select');
  await selects[0].selectOption({ label: 'Attendance' });
  await selects[1].selectOption({ label: 'Monthly cycle' });
  await page.waitForTimeout(500);

  // employee select (index 10) - try selecting Arjun Menon
  await selects[10].selectOption({ label: 'Arjun Menon (EMP020)' }).catch(async e=>{
    console.log('employee select err', e.message);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: SS + '08d-filters-set.png', fullPage: true });

  await page.locator('button:has-text("Filter")').first().click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', {timeout:15000}).catch(()=>{});
  await page.screenshot({ path: SS + '08e-register-after-filter.png', fullPage: true });

  const rows = await page.$$eval('table tbody tr', trs => trs.map(tr => Array.from(tr.querySelectorAll('td')).map(td=>td.innerText.trim())));
  console.log('REGISTER ROWS AFTER FILTER:', JSON.stringify(rows, null, 1));

  // also grab header row for column names
  const headers = await page.$$eval('table thead tr th', ths => ths.map(th=>th.innerText.trim()));
  console.log('HEADERS:', JSON.stringify(headers));
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
