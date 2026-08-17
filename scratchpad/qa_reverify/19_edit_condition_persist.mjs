import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SS = __dirname;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, storageState: `${SS}/authState.json` });
const page = await context.newPage();

const netLog = [];
page.on('response', res => { if (res.url().includes('/api/')) netLog.push(`${res.status()} ${res.request().method()} ${res.url()}`); });
page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

await page.goto('http://localhost:5173/payroll/master-settings', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.locator('text=HRA').first().click();
await page.waitForTimeout(1500);
const hraRow = page.locator('table').last().locator('tbody tr', { hasText: 'HRA' }).first();
await hraRow.locator('button').first().click();
await page.waitForTimeout(1500);

// Scroll down to find Condition Setting / Gender section
await page.locator('text=Condition Setting').scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await page.screenshot({ path: `${SS}/19a_condition_setting_section.png`, fullPage: false });

const bodyText = await page.locator('body').innerText();
const idx = bodyText.indexOf('Condition Setting');
console.log('=== Condition Setting section text ===');
console.log(bodyText.slice(idx, idx + 600));

// Find Gender radio buttons -- likely labeled buttons "All", "Male", "Female"
const genderSection = page.locator('text=Gender').locator('xpath=following::*[1]');
console.log('Attempting to click "Male" option near Gender label...');

// Try clicking a button/label with exact text "Male"
const maleOption = page.getByText('Male', { exact: true }).first();
const maleCount = await page.getByText('Male', { exact: true }).count();
console.log('Male option count:', maleCount);
if (maleCount > 0) {
  await maleOption.click();
  await page.waitForTimeout(500);
}

await page.screenshot({ path: `${SS}/19b_gender_male_selected.png`, fullPage: false });

// Scroll to Update button and click it
const updateBtn = page.getByRole('button', { name: 'Update', exact: true });
await updateBtn.scrollIntoViewIfNeeded();
await page.screenshot({ path: `${SS}/19c_before_update_click.png`, fullPage: false });
await updateBtn.click();
await page.waitForTimeout(2500);
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await page.screenshot({ path: `${SS}/19d_after_update_click.png`, fullPage: true });

const bodyText2 = await page.locator('body').innerText();
console.log('=== Tail after update click ===');
console.log(bodyText2.slice(-800));

console.log('--- API calls ---');
console.log(netLog.slice(-10).join('\n'));

await browser.close();
