import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SS = __dirname;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, storageState: `${SS}/authState.json` });
const page = await context.newPage();

page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });

// Full page reload (fresh navigation, not SPA cached state)
await page.goto('http://localhost:5173/payroll/master-settings', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.locator('text=HRA').first().click();
await page.waitForTimeout(1500);
const hraRow = page.locator('table').last().locator('tbody tr', { hasText: 'HRA' }).first();
await hraRow.locator('button').first().click();
await page.waitForTimeout(1500);

await page.locator('text=Condition Setting').scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await page.screenshot({ path: `${SS}/20a_reloaded_condition_check.png`, fullPage: false });

// Check which gender option appears selected -- look for aria-pressed / active class
const genderButtons = page.locator('button:has-text("All"), button:has-text("Male"), button:has-text("Female")');
const count = await genderButtons.count();
for (let i = 0; i < count; i++) {
  const btn = genderButtons.nth(i);
  const text = await btn.textContent();
  const cls = await btn.getAttribute('class');
  console.log(`Button "${text?.trim()}" class="${cls}"`);
}

await browser.close();
