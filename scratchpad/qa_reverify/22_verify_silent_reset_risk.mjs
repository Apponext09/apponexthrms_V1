import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SS = __dirname;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, storageState: `${SS}/authState.json` });
const page = await context.newPage();

await page.goto('http://localhost:5173/payroll/master-settings', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.locator('text=HRA').first().click();
await page.waitForTimeout(1500);
const hraRow = page.locator('table').last().locator('tbody tr', { hasText: 'HRA' }).first();
await hraRow.locator('button').first().click();
await page.waitForTimeout(1500);

// Do NOT touch gender at all -- just click Update directly (simulating an unrelated edit)
const updateBtn = page.getByRole('button', { name: 'Update', exact: true });
await updateBtn.scrollIntoViewIfNeeded();
await updateBtn.click();
await page.waitForTimeout(2000);
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
console.log('Clicked update without touching gender field.');

await browser.close();
