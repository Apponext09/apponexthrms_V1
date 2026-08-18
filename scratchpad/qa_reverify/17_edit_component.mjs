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

await page.goto('http://localhost:5173/payroll/master-settings', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// Click the HRA group header to show its components in right panel
await page.locator('text=HRA').first().click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SS}/17a_hra_group_selected.png`, fullPage: true });

const bodyText = await page.locator('body').innerText();
const idx = bodyText.indexOf('Component Type');
console.log(bodyText.slice(Math.max(0, idx - 100), idx + 800));

await browser.close();
