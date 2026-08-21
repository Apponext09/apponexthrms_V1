import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SS = __dirname;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, storageState: `${SS}/authState.json` });
const page = await context.newPage();

const netErrors = [];
page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
page.on('response', res => {
  if (res.status() >= 400) {
    netErrors.push(`${res.status()} ${res.request().method()} ${res.url()}`);
  }
});

console.log('Navigating to Payroll Processing...');
await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${SS}/02_payroll_processing_landing.png`, fullPage: true });
console.log('URL:', page.url());

// Look for tab navigation
const tabTexts = await page.locator('[role="tab"], button, a').allTextContents();
console.log('Possible tab/button texts (first 60):', JSON.stringify(tabTexts.slice(0, 60)));

console.log('--- Network errors so far ---');
console.log(netErrors.join('\n'));

await browser.close();
