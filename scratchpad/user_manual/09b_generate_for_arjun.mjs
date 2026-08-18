import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();
page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

const apiLog = [];
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('127.0.0.1:5000') && url.includes('payslip')) {
    let body = null; try { body = await res.json(); } catch {}
    apiLog.push({ url, method: res.request().method(), status: res.status(), body });
  }
});

try {
  await page.goto('http://localhost:5173/payroll/payslip-requests', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1800);

  const selects = await page.$$('select');
  const inputs = await page.$$eval('input', els => els.map(e => ({type:e.type, value:e.value})));
  console.log('num selects', selects.length, 'inputs', JSON.stringify(inputs));
  for (let i=0;i<selects.length;i++){
    const opts = await selects[i].$$eval('option', os=>os.map(o=>o.textContent.trim()));
    console.log(i, opts.slice(0,15));
  }
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
