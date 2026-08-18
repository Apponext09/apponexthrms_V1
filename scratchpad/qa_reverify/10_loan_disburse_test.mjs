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

await page.locator('button:has-text("Disburse Loan")').first().click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SS}/10a_disburse_modal.png`, fullPage: true });

const bodyText = await page.locator('body').innerText();
console.log('=== Modal text ===');
console.log(bodyText.slice(-2500));

await browser.close();
