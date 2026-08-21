import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

const apiLog = [];
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('127.0.0.1:5000') && url.includes('payslip')) {
    let body = null; try { body = await res.json(); } catch {}
    apiLog.push({ url, method: res.request().method(), status: res.status(), body });
  }
});
page.on('requestfailed', req => {
  console.log('REQUEST FAILED:', req.method(), req.url(), req.failure()?.errorText);
});

try {
  await page.goto('http://localhost:5173/payroll/payslip-requests', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  console.log('=== INITIAL PAYSLIPS GET ===');
  console.log(JSON.stringify(apiLog, null, 1).slice(0, 3000));

  // try each month to see if Arjun has any existing payslip
  const selects = await page.$$('select');
  await selects[2].selectOption({ label: 'Arjun Menon (EMP-179) — hr' });
  const monthOpts = await selects[3].$$eval('option', os=>os.map(o=>o.textContent.trim()));
  for (const m of monthOpts) {
    await selects[3].selectOption({ label: m });
    await page.waitForTimeout(900);
    const t = await page.innerText('body');
    const has = !t.includes('No Payslips Generated');
    console.log(m, '-> has payslips:', has, t.includes('Statements') ? t.match(/\d+ Statements/)?.[0] : '');
  }
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
