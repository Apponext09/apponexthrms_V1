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

await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);

const assignTab = page.locator('button:has-text("Assign Slab"), a:has-text("Assign Slab")').first();
console.log('Assign Slab tab present:', await assignTab.count() > 0);
await assignTab.click();
await page.waitForTimeout(2000);
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await page.screenshot({ path: `${SS}/05_assign_slab_tab.png`, fullPage: true });

const bodyText = await page.locator('body').innerText();
const idx = bodyText.indexOf('Assign Slab');
console.log(bodyText.slice(idx, idx + 1500));

await browser.close();
