import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SS = __dirname;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, storageState: `${SS}/authState.json` });
const page = await context.newPage();

const netLog = [];
page.on('response', res => { if (res.url().includes('/api/')) netLog.push(`${res.status()} ${res.request().method()} ${res.url()}`); });
page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });

await page.goto('http://localhost:5173/payroll/loans', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);
await page.locator('button:has-text("Pending")').first().click();
await page.waitForTimeout(1500);

// Scope to the priya mishra card, click exact "Approve" button (not "Active & Approved")
const card = page.locator('text=priya mishra').locator('xpath=ancestor::*[contains(@class,"Card") or self::div][1]').first();
// Fallback: use exact text match button within the whole page, excluding tab buttons by role
const approveBtn = page.getByRole('button', { name: 'Approve', exact: true });
console.log('Exact "Approve" buttons found:', await approveBtn.count());

await approveBtn.first().click();
await page.waitForTimeout(2500);
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await page.screenshot({ path: `${SS}/14a_after_precise_approve.png`, fullPage: true });

const bodyText = await page.locator('body').innerText();
const idx = bodyText.indexOf('TOTAL APPLICATIONS');
console.log('=== Tiles after approve ===');
console.log(bodyText.slice(idx, idx + 300));
console.log('=== Tail (for toast) ===');
console.log(bodyText.slice(-800));

console.log('--- API calls ---');
console.log(netLog.slice(-15).join('\n'));

await browser.close();
