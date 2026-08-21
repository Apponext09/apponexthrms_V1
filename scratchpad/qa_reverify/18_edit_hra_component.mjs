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
page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

await page.goto('http://localhost:5173/payroll/master-settings', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.locator('text=HRA').first().click();
await page.waitForTimeout(1500);

// Click edit (pencil) icon on "HRA" row (first row in right panel table)
const editIcons = page.locator('table').last().locator('tbody tr').first().locator('button, svg, a');
const rowCount = await page.locator('table').last().locator('tbody tr').count();
console.log('Rows in right panel table:', rowCount);

// Click first action button (edit pencil) in the HRA row
const hraRow = page.locator('table').last().locator('tbody tr', { hasText: 'HRA' }).first();
const actionButtons = hraRow.locator('button');
console.log('Action buttons in HRA row:', await actionButtons.count());
await actionButtons.first().click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SS}/18a_edit_modal_opened.png`, fullPage: true });

const bodyText = await page.locator('body').innerText();
console.log('=== Edit modal text (tail) ===');
console.log(bodyText.slice(-3000));

await browser.close();
