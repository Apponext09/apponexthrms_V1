import { chromium } from 'playwright';
const outDir = 'scratchpad/screenshots';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1400 } });

await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[type="email"]', { timeout: 15000 });
await page.fill('input[type="email"]', 'abhishek@gmail.com');
await page.fill('input[type="password"]', 'abhishek@gmail.com');
await page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first().click();
await page.waitForTimeout(3000);

await page.goto('http://localhost:5173/payroll/settings?tab=slabs', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

await page.fill('input[placeholder="e.g. Monthly Senior Slab"]', 'QA_Slab_01');

await page.locator('button:has-text("Choose")').first().click();
await page.waitForTimeout(300);
await page.locator('text=Engineering').click();
await page.waitForTimeout(300);

await page.locator('button:has-text("Choose")').first().click();
await page.waitForTimeout(300);
await page.locator('text=Senior').click();
await page.waitForTimeout(300);

// Locations: Headquarters + Mumbai Office
await page.locator('label:has-text("Headquarters")').locator('input[type="checkbox"]').check();
await page.locator('label:has-text("Mumbai Office")').locator('input[type="checkbox"]').check();

// CTC min/max via number inputs
const numberInputs = page.locator('input[type="number"]');
await numberInputs.nth(0).fill('75000');
await numberInputs.nth(1).fill('500000');

// Component
await page.locator('label:has-text("QA_Component_01")').locator('input[type="checkbox"]').check();

// Cycle already QA_Local_Cycle_01 by default, leave as is since only one exists

// Active -> toggle off
await page.locator('button:has([class*="rounded-full"])').filter({ has: page.locator('span') }).first();
const activeToggle = page.locator('span:has-text("Active")').last().locator('xpath=preceding-sibling::button[1]');
await activeToggle.click();

await page.screenshot({ path: `${outDir}/slab_03_filled.png`, fullPage: true });

await page.locator('button:has-text("Save Slab")').click();
await page.waitForTimeout(2000);
await page.screenshot({ path: `${outDir}/slab_04_after_save.png`, fullPage: true });

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${outDir}/slab_05_view_after_reload.png`, fullPage: true });

// select the slab to load its edit form
await page.locator('text=QA_Slab_01').first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/slab_06_edit_after_reload.png`, fullPage: true });

await browser.close();
