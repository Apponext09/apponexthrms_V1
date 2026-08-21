import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SS = __dirname;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, storageState: `${SS}/authState.json` });
const page = await context.newPage();

page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });

await page.goto('http://localhost:5173/payroll/master-settings', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// Cycles tab
await page.locator('button:has-text("Cycles")').first().click();
await page.waitForTimeout(2000);
await page.screenshot({ path: `${SS}/23a_cycles_tab.png`, fullPage: true });
let bodyText = await page.locator('body').innerText();
let idx = bodyText.indexOf('Payroll Master Settings');
console.log('=== Cycles tab ===');
console.log(bodyText.slice(idx, idx + 1500));

// Slabs & Statutory Rules tab
await page.locator('button:has-text("Slabs & Statutory Rules")').first().click();
await page.waitForTimeout(2000);
await page.screenshot({ path: `${SS}/23b_slabs_tab.png`, fullPage: true });
bodyText = await page.locator('body').innerText();
idx = bodyText.indexOf('Payroll Master Settings');
console.log('=== Slabs tab ===');
console.log(bodyText.slice(idx, idx + 1500));

await browser.close();
