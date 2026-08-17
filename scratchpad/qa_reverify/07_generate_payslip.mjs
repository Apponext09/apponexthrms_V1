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

// Find the employee select dropdown - likely a <select> element
const selects = page.locator('select');
const selectCount = await selects.count();
console.log('Select elements found:', selectCount);
for (let i = 0; i < selectCount; i++) {
  const opts = await selects.nth(i).locator('option').allTextContents();
  console.log(`Select[${i}] options (first 5):`, opts.slice(0, 5));
}

// Try to locate the employee dropdown specifically by nearby label text, else guess index
let empSelect = null;
for (let i = 0; i < selectCount; i++) {
  const opts = await selects.nth(i).locator('option').allTextContents();
  if (opts.some(o => o.includes('EMP-171') || o.includes('Aarav'))) {
    empSelect = selects.nth(i);
    break;
  }
}

if (empSelect) {
  await empSelect.selectOption({ label: 'Aarav Mehta (EMP-171) — hr' }).catch(async () => {
    const opts = await empSelect.locator('option').allTextContents();
    const match = opts.find(o => o.includes('Aarav'));
    if (match) await empSelect.selectOption({ label: match });
  });
  console.log('Selected employee.');
} else {
  console.log('Could not find employee select via option text; trying second select as fallback.');
}

await page.waitForTimeout(1000);

// Ensure month select = August 2026
let monthSelect = null;
for (let i = 0; i < selectCount; i++) {
  const opts = await selects.nth(i).locator('option').allTextContents();
  if (opts.some(o => o.includes('2026') && o.includes('Current'))) {
    monthSelect = selects.nth(i);
    break;
  }
}
if (monthSelect) {
  await monthSelect.selectOption({ label: 'August 2026 (Current Month)' }).catch(e => console.log('month select err', e.message));
  console.log('Selected month August 2026.');
}

await page.waitForTimeout(1000);
await page.screenshot({ path: `${SS}/07a_before_generate.png`, fullPage: true });

const genBtn = page.locator('button:has-text("Generate Payslip")').first();
await genBtn.click();
await page.waitForTimeout(3000);
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await page.screenshot({ path: `${SS}/07b_after_generate.png`, fullPage: true });

const bodyText = await page.locator('body').innerText();
console.log('=== Body tail after generate click ===');
console.log(bodyText.slice(-2000));

console.log('Native dialog fired?', dialogFired);
console.log('--- Recent API calls ---');
console.log(netLog.slice(-15).join('\n'));

await browser.close();
