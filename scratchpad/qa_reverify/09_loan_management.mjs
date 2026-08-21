import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SS = __dirname;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, storageState: `${SS}/authState.json` });
const page = await context.newPage();

page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
const netLog = [];
page.on('response', res => { if (res.url().includes('/api/')) netLog.push(`${res.status()} ${res.request().method()} ${res.url()}`); });

await page.goto('http://localhost:5173/payroll/loans', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${SS}/09a_loan_management_landing.png`, fullPage: true });

const bodyText1 = await page.locator('body').innerText();
const idx1 = bodyText1.indexOf('Loan');
console.log('=== Loan Management landing text ===');
console.log(bodyText1.slice(idx1, idx1 + 1500));

// Click "All Requests" tab if present
const allReqTab = page.locator('button:has-text("All Requests"), a:has-text("All Requests"), [role="tab"]:has-text("All Requests")').first();
const allReqCount = await page.locator('button:has-text("All Requests"), a:has-text("All Requests"), [role="tab"]:has-text("All Requests")').count();
console.log('All Requests tab found:', allReqCount);
if (allReqCount > 0) {
  await allReqTab.click();
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.screenshot({ path: `${SS}/09b_all_requests_tab.png`, fullPage: true });
  const bodyText2 = await page.locator('body').innerText();
  const idx2 = bodyText2.indexOf('All Requests');
  console.log('=== All Requests tab text ===');
  console.log(bodyText2.slice(idx2, idx2 + 2500));
}

console.log('--- API calls ---');
console.log(netLog.join('\n'));

await browser.close();
