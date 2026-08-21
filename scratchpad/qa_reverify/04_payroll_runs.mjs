import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SS = __dirname;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, storageState: `${SS}/authState.json` });
const page = await context.newPage();

const netLog = [];
page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
page.on('response', res => {
  if (res.url().includes('/api/')) {
    netLog.push(`${res.status()} ${res.request().method()} ${res.url()}`);
  }
});

await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);

await page.locator('button:has-text("Payroll Runs"), a:has-text("Payroll Runs")').first().click();
await page.waitForTimeout(2500);
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await page.screenshot({ path: `${SS}/04a_payroll_runs_tab.png`, fullPage: true });

// Extract text of summary tiles and table
const bodyText = await page.locator('body').innerText();
console.log('=== PAGE TEXT (first 3000 chars) ===');
console.log(bodyText.slice(0, 3000));

// Try clicking View Details on the first row
const viewDetailsBtn = page.locator('button:has-text("View Details"), a:has-text("View Details")').first();
const viewCount = await page.locator('button:has-text("View Details"), a:has-text("View Details")').count();
console.log('View Details buttons found:', viewCount);

if (viewCount > 0) {
  await viewDetailsBtn.click();
  await page.waitForTimeout(2500);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.screenshot({ path: `${SS}/04b_view_details_modal.png`, fullPage: true });
  const modalText = await page.locator('body').innerText();
  console.log('=== AFTER VIEW DETAILS CLICK (last 2500 chars of body text) ===');
  console.log(modalText.slice(-2500));
}

console.log('--- API calls (last 20) ---');
console.log(netLog.slice(-20).join('\n'));

await browser.close();
