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
  const selects = await page.$$('select');
  await selects[0].selectOption({ label: 'Attendance' });
  await selects[1].selectOption({ label: 'Monthly cycle' });
  await selects[10].selectOption({ label: 'Arjun Menon (EMP020)' });

  // change month/period input (type=month)
  const monthInput = page.locator('input[type="month"]').first();
  await monthInput.fill('2026-09');
  await page.waitForTimeout(500);
  await page.screenshot({ path: SS + '08m-sept-filters-set.png', fullPage: true });

  await page.locator('button:has-text("Filter")').first().click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', {timeout:15000}).catch(()=>{});
  await page.screenshot({ path: SS + '08n-sept-register-before-process.png', fullPage: true });

  const t = await page.innerText('body');
  console.log(t.slice(t.indexOf('Run #'), t.indexOf('Run #')+200));
  console.log(t.indexOf('No records found') > -1 ? 'NO RECORDS' : 'HAS RECORDS');

  const rowData = await page.$$eval('table tbody tr', trs => trs.map(tr => Array.from(tr.querySelectorAll('td')).map(td => {
    const input = td.querySelector('input');
    if (input) return 'INPUT:' + input.value;
    return td.innerText.trim();
  })));
  console.log('SEPT ROW (before process):', JSON.stringify(rowData));
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
