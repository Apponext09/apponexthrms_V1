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

const selects = page.locator('select');
const selectCount = await selects.count();

let empSelect = null, monthSelect = null;
for (let i = 0; i < selectCount; i++) {
  const opts = await selects.nth(i).locator('option').allTextContents();
  if (opts.some(o => o.includes('Aarav'))) empSelect = selects.nth(i);
  if (opts.some(o => o.includes('July 2026'))) monthSelect = selects.nth(i);
}

const empOpts = await empSelect.locator('option').allTextContents();
const empLabel = empOpts.find(o => o.includes('Aarav'));
await empSelect.selectOption({ label: empLabel });
console.log('Selected employee:', empLabel);

const monthOpts = await monthSelect.locator('option').allTextContents();
const julyLabel = monthOpts.find(o => o.trim() === 'July 2026');
await monthSelect.selectOption({ label: julyLabel });
console.log('Selected month:', julyLabel);

await page.waitForTimeout(1000);
await page.screenshot({ path: `${SS}/08a_before_generate_july.png`, fullPage: true });

const genBtn = page.locator('button:has-text("Generate Payslip")').first();
await genBtn.click();
await page.waitForTimeout(3000);
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await page.screenshot({ path: `${SS}/08b_after_generate_july.png`, fullPage: true });

const bodyText = await page.locator('body').innerText();
console.log('=== Body tail after generate click (July) ===');
console.log(bodyText.slice(-2500));

console.log('Native dialog fired?', dialogFired);
console.log('--- Recent API calls ---');
console.log(netLog.slice(-10).join('\n'));

await browser.close();
