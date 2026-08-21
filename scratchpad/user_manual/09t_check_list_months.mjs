import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

const apiLog = [];
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('127.0.0.1:5000/api/v1/payroll/payslips') && res.request().method()==='GET') {
    let body = null; try { body = await res.json(); } catch {}
    apiLog.push({ url, status: res.status(), count: body?.data?.length });
  }
});

try {
  await page.goto('http://localhost:5173/payroll/payslip-requests', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  const selects = await page.$$('select');
  await selects[2].selectOption({ label: 'Arjun Menon (EMP-179) — hr' });
  const monthOpts = await selects[3].$$eval('option', os=>os.map(o=>o.textContent.trim()));
  for (const m of monthOpts.slice(0,4)) {
    await selects[3].selectOption({ label: m });
    await page.waitForTimeout(1000);
    const t = await page.innerText('body');
    console.log(m, '-> statements:', t.match(/\d+ Statements/)?.[0], 'noPayslipsMsg:', t.includes('No Payslips Generated'));
  }
  console.log('API LOG:', JSON.stringify(apiLog, null, 1));
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
