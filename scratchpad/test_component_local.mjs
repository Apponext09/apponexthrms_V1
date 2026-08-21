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

// Add Component on the existing QA_Earning_Group_01 group
await page.locator('button:has-text("+ Add Component")').first().click();
await page.waitForTimeout(500);

await page.fill('input[placeholder="e.g. Mobile Allowance"]', 'QA_Component_01');

const toggleRow = async (label, choice) => {
  const row = page.locator(`label:has-text("${label}")`).locator('xpath=following-sibling::div[1]');
  await row.locator(`button:has-text("${choice}")`).click();
};
await toggleRow('Non-Cashable Item', 'Yes');
await toggleRow('Based On Attendance', 'Yes');

// Active checkbox
const activeCheckbox = page.locator('label:has-text("Active")').locator('xpath=preceding-sibling::input[1]');
await page.locator('span:has-text("Active")').locator('xpath=preceding-sibling::input[1]').check().catch(async()=>{
  console.log('active checkbox alt path needed');
});

// Component Type -> Value (default), set amount
await page.locator('button:has-text("Value")').first().click();
await page.fill('input[placeholder="e.g. 5000.00"]', '12345.50');

// Boundary type -> Range, min/max
await page.locator('label:has-text("Boundary Type")').locator('xpath=following-sibling::select[1]').selectOption({ label: 'Range' });
await page.fill('input[placeholder="0.00"]', '1000');
await page.fill('input[placeholder="75.00"]', '9999');

// Effective dates
await page.locator('label:has-text("Effective From Date")').locator('xpath=following-sibling::input[1]').fill('2026-01-01');
await page.locator('label:has-text("Effective To Date")').locator('xpath=following-sibling::input[1]').fill('2026-12-31');

await page.screenshot({ path: `${outDir}/comp_10_before_scroll.png`, fullPage: true });

// Condition Setting
await page.locator('label:has-text("Condition On")').locator('xpath=following-sibling::select[1]').selectOption({ label: 'Basic Pay' });
await page.locator('label:has-text("Operator")').locator('xpath=following-sibling::select[1]').selectOption({ value: 'BETWEEN' });
await page.locator('label:has-text("Value1")').locator('xpath=following-sibling::input[1]').fill('10');
await page.locator('label:has-text("Value2")').locator('xpath=following-sibling::input[1]').fill('90');

// Months -> select Jan, Feb
await page.locator('summary:has-text("[+] Months")').click();
await page.waitForTimeout(200);
await page.locator('label:has-text("January")').locator('input[type="checkbox"]').check();
await page.locator('label:has-text("February")').locator('input[type="checkbox"]').check();

// Gender -> Female
await page.locator('button:has-text("Female")').click();

await page.screenshot({ path: `${outDir}/comp_11_condition_filled.png`, fullPage: true });

await page.locator('button:has-text("+ Save Component"), button:has-text("Save Component")').first().click().catch(async () => {
  console.log('save component button alt text needed, trying generic Save');
});

await page.waitForTimeout(2000);
await page.screenshot({ path: `${outDir}/comp_12_after_save.png`, fullPage: true });

console.log('URL:', page.url());
await browser.close();
