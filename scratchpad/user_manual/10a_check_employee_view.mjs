import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

const apiLog = [];
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('127.0.0.1:5000') && (url.includes('my-salary-structure') || url.includes('my-payslip'))) {
    let body = null; try { body = await res.json(); } catch {}
    apiLog.push({ url, status: res.status(), body });
  }
});

try {
  // check employee profile for a "login as" or "impersonate" button
  await page.goto('http://localhost:5173/employees/179', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  const buttons = await page.$$eval('button, a', els => els.map(e=>e.textContent.trim()).filter(Boolean));
  console.log('Buttons containing login/impersonate/view as:', buttons.filter(b => /login|impersonat|view as|switch/i.test(b)));

  // try hitting my-salary-structure directly as admin (probably resolves to admin's own, likely empty)
  await page.goto('http://localhost:5173/payroll/my-salary-structure', { waitUntil: 'networkidle', timeout: 20000 }).catch(e=>console.log('nav err', e.message));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SS + '10b-my-salary-structure-as-admin.png', fullPage: true });
  console.log('URL:', page.url());

  console.log('API LOG:', JSON.stringify(apiLog, null, 1));
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
