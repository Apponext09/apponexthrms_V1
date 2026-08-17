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
  await selects[1].selectOption({ label: 'QA_ROUND3_TEST_CYCLE' });
  await selects[10].selectOption({ label: 'Arjun Menon (EMP020)' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: SS + '08p-qacycle-filters.png', fullPage: true });

  await page.locator('button:has-text("Filter")').first().click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', {timeout:15000}).catch(()=>{});
  await page.screenshot({ path: SS + '08q-qacycle-register.png', fullPage: true });

  const t = await page.innerText('body');
  const runIdx = t.indexOf('Run #');
  console.log('RUN STATUS AREA:', runIdx>-1 ? t.slice(runIdx, runIdx+200) : 'no Run# found');
  console.log('HAS "No records found":', t.includes('No records found'));

  const rowData = await page.$$eval('table tbody tr', trs => trs.map(tr => Array.from(tr.querySelectorAll('td')).map(td => {
    const input = td.querySelector('input');
    if (input) return 'INPUT:' + input.value;
    return td.innerText.trim();
  })));
  console.log('QA CYCLE ROW:', JSON.stringify(rowData));
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
