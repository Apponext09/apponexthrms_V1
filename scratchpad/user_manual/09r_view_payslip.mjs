import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/payslip-requests', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1800);
  const selects = await page.$$('select');
  await selects[2].selectOption({ label: 'Arjun Menon (EMP-179) — hr' });
  await selects[3].selectOption({ label: 'July 2026' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SS + '09s-payslip-list-july.png', fullPage: true });
  const t = await page.innerText('body');
  console.log(t.slice(t.indexOf('Monthly Salary Statements'), t.indexOf('Monthly Salary Statements')+2000));

  // try to find a View/Download button for the generated payslip
  const buttons = await page.$$eval('button', els => els.map(e=>e.textContent.trim()).filter(Boolean));
  console.log('BUTTONS:', JSON.stringify([...new Set(buttons)]));
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
