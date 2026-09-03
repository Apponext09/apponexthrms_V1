import { chromium } from 'playwright';

const STATE = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/storageState.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('generate-from-process')) {
    let text = null;
    try { text = await res.text(); } catch {}
    console.log('STATUS:', res.status());
    console.log('BODY:', text?.slice(0, 1000));
    console.log('REQ METHOD:', res.request().method());
    console.log('REQ POSTDATA:', res.request().postData());
  }
});

try {
  await page.goto('http://localhost:5173/payroll/payslip-requests', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1800);
  const selects = await page.$$('select');
  await selects[2].selectOption({ label: 'Arjun Menon (EMP-179) — hr' });
  await selects[3].selectOption({ label: 'August 2026 (Current Month)' });
  await page.waitForTimeout(500);
  await page.locator('button:has-text("Generate Payslip")').first().click();
  await page.waitForTimeout(3000);
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
