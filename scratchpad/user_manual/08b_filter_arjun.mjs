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

  // Generate Payroll On select
  const selects = await page.$$('select');
  console.log('num selects:', selects.length);
  for (let i=0;i<selects.length;i++){
    const opts = await selects[i].$$eval('option', os=>os.map(o=>o.textContent.trim()));
    console.log(i, opts.slice(0,6));
  }
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
