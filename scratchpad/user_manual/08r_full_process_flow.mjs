import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();
page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

function rowExtract(page) {
  return page.$$eval('table tbody tr', trs => trs.map(tr => Array.from(tr.querySelectorAll('td')).map(td => {
    const input = td.querySelector('input');
    if (input) return 'INPUT:' + input.value;
    return td.innerText.trim();
  })));
}

try {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  const selects = await page.$$('select');
  await selects[0].selectOption({ label: 'Attendance' });
  await selects[1].selectOption({ label: 'QA_ROUND3_TEST_CYCLE' });
  await selects[10].selectOption({ label: 'Arjun Menon (EMP020)' });
  await page.waitForTimeout(500);
  await page.locator('button:has-text("Filter")').first().click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', {timeout:15000}).catch(()=>{});
  await page.screenshot({ path: SS + '08s-BEFORE-process.png', fullPage: true });
  console.log('BEFORE PROCESS:', JSON.stringify(await rowExtract(page)));

  // 1. Process Payroll
  await page.locator('button:has-text("1. Process Payroll")').click();
  await page.waitForTimeout(6000);
  await page.waitForLoadState('networkidle', {timeout:20000}).catch(()=>{});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SS + '08t-AFTER-process.png', fullPage: true });
  console.log('AFTER PROCESS:', JSON.stringify(await rowExtract(page)));
  const bodyText1 = await page.innerText('body');
  console.log('toast candidates:', bodyText1.match(/(success|processed|error|failed)[^\n]{0,120}/gi)?.slice(0,5));

} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
