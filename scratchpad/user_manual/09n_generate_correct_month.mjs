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
  await selects[2].selectOption({ label: 'Arjun Menon (EMP-179) — hr' });
  await selects[3].selectOption({ label: 'July 2026' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: SS + '09o-july-before-generate.png', fullPage: true });

  await page.locator('button:has-text("Generate Payslip")').first().click();
  await page.waitForTimeout(4000);
  await page.waitForLoadState('networkidle', {timeout:15000}).catch(()=>{});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SS + '09p-july-after-generate.png', fullPage: true });

  console.log('=== API LOG ===');
  console.log(JSON.stringify(apiLog, null, 1));
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
