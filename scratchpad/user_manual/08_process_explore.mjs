import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: SS + '08a-process-landing.png', fullPage: true });

  const t = await page.innerText('body');
  console.log(t.slice(t.indexOf('Filter'), t.indexOf('Filter')+2000));

  // check register table for Arjun Menon row
  const rows = await page.$$eval('table tbody tr', trs => trs.map(tr => Array.from(tr.querySelectorAll('td')).map(td=>td.innerText.trim())));
  console.log('REGISTER ROWS:', JSON.stringify(rows, null, 1));
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
