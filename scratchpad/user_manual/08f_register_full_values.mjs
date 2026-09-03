import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  const selects = await page.$$('select');
  await selects[0].selectOption({ label: 'Attendance' });
  await selects[1].selectOption({ label: 'Monthly cycle' });
  await selects[10].selectOption({ label: 'Arjun Menon (EMP020)' });
  await page.waitForTimeout(500);
  await page.locator('button:has-text("Filter")').first().click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', {timeout:15000}).catch(()=>{});

  // get header labels
  const headers = await page.$$eval('table thead tr th', ths => ths.map(th=>th.innerText.trim()));

  // for the data row, get cell-by-cell value: prefer input value if input exists, else innerText
  const rowData = await page.$$eval('table tbody tr', trs => trs.map(tr => {
    return Array.from(tr.querySelectorAll('td')).map(td => {
      const input = td.querySelector('input');
      if (input) return 'INPUT:' + input.value;
      const btn = td.querySelector('button');
      if (btn) return 'BTN:' + td.innerText.trim();
      return td.innerText.trim();
    });
  }));

  console.log('HEADERS ('+headers.length+'):', JSON.stringify(headers));
  console.log('ROW ('+rowData[0].length+'):', JSON.stringify(rowData[0]));

  // pair them up
  const row = rowData[0];
  const n = Math.max(headers.length, row.length);
  for (let i=0;i<n;i++){
    console.log(i, headers[i]||'(no header)', '=', row[i]!==undefined?row[i]:'(no cell)');
  }

  await page.screenshot({ path: SS + '08g-register-wide.png', fullPage: true });
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
