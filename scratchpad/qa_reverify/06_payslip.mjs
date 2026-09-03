import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SS = __dirname;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, storageState: `${SS}/authState.json` });
const page = await context.newPage();

let dialogFired = false;
page.on('dialog', async d => { dialogFired = true; console.log('NATIVE DIALOG FIRED:', d.message()); await d.accept(); });
page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
const netLog = [];
page.on('response', res => { if (res.url().includes('/api/')) netLog.push(`${res.status()} ${res.request().method()} ${res.url()}`); });

await page.goto('http://localhost:5173/payroll/payslips', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${SS}/06a_payslip_management_landing.png`, fullPage: true });
console.log('URL:', page.url());

const bodyText1 = await page.locator('body').innerText();
const idx1 = bodyText1.indexOf('Payslip');
console.log('=== Page area near "Payslip" ===');
console.log(bodyText1.slice(idx1, idx1 + 1200));

// Try clicking Generate Payslip with no employee selected
const genBtn = page.locator('button:has-text("Generate Payslip")').first();
const genCount = await page.locator('button:has-text("Generate Payslip")').count();
console.log('Generate Payslip buttons found:', genCount);

if (genCount > 0) {
  await genBtn.click({ timeout: 5000 }).catch(e => console.log('Click error:', e.message));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SS}/06b_generate_no_employee_toast.png`, fullPage: true });
  console.log('Native dialog fired on empty click?', dialogFired);
  const bodyText2 = await page.locator('body').innerText();
  console.log('=== Body text tail after empty click ===');
  console.log(bodyText2.slice(-800));
}

console.log('--- Recent API calls ---');
console.log(netLog.slice(-15).join('\n'));

await browser.close();
