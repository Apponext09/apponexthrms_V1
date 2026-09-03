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

await page.goto('http://localhost:5173/payroll/settings?tab=components', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

await page.locator('button:has-text("+ Add Component")').first().click();
await page.waitForTimeout(500);

await page.fill('input[placeholder="e.g. Mobile Allowance"]', 'QA_Component_01');

const toggleRow = async (label, choice) => {
  const row = page.locator(`label:has-text("${label}")`).locator('xpath=following-sibling::div[1]');
  await row.locator(`button:has-text("${choice}")`).click();
};
await toggleRow('Non-Cashable Item', 'Yes');
await toggleRow('Based On Attendance', 'Yes');
await page.locator('span:has-text("Active")').locator('xpath=preceding-sibling::input[1]').check();

await page.locator('button:has-text("Value")').first().click();
await page.fill('input[placeholder="e.g. 5000.00"]', '12345.50');

await page.locator('label:has-text("Boundary Type")').locator('xpath=following-sibling::select[1]').selectOption({ label: 'Range' });
await page.fill('input[placeholder="0.00"]', '1000');
await page.fill('input[placeholder="75.00"]', '9999');

await page.locator('label:has-text("Effective From Date")').locator('xpath=following-sibling::input[1]').fill('2026-01-01');
await page.locator('label:has-text("Effective To Date")').locator('xpath=following-sibling::input[1]').fill('2026-12-31');

await page.locator('label:has-text("Condition On")').locator('xpath=following-sibling::select[1]').selectOption({ label: 'Basic Pay' });
await page.locator('label:has-text("Operator")').locator('xpath=following-sibling::select[1]').selectOption({ value: 'BETWEEN' });
await page.locator('label:has-text("Value1")').locator('xpath=following-sibling::input[1]').fill('10');
await page.locator('label:has-text("Value2")').locator('xpath=following-sibling::input[1]').fill('90');

await page.locator('summary:has-text("[+] Months")').click();
await page.waitForTimeout(200);
await page.locator('label:has-text("January")').locator('input[type="checkbox"]').check();
await page.locator('label:has-text("February")').locator('input[type="checkbox"]').check();

await page.locator('button:has-text("Female")').click();

await page.screenshot({ path: `${outDir}/comp_11b_condition_filled.png`, fullPage: true });

await page.locator('button:has-text("Update")').first().click();
await page.waitForTimeout(2000);

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${outDir}/comp_13_view_after_reload.png`, fullPage: true });

// Open the component again to inspect persisted values
await page.locator('span:has-text("QA_Component_01")').first().click();
await page.waitForTimeout(500);
await page.locator('summary:has-text("[+] Months")').click().catch(()=>{});
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/comp_14_edit_after_reload.png`, fullPage: true });

await browser.close();
