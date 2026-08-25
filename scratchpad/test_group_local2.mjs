import { chromium } from 'playwright';
const outDir = 'scratchpad/screenshots';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1200 } });

await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[type="email"]', { timeout: 15000 });
await page.fill('input[type="email"]', 'abhishek@gmail.com');
await page.fill('input[type="password"]', 'abhishek@gmail.com');
await page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first().click();
await page.waitForTimeout(3000);

await page.goto('http://localhost:5173/payroll/settings?tab=components', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

await page.locator('button:has-text("+ Group")').click();
await page.waitForTimeout(500);

// Group Name
await page.fill('input[placeholder="Group Name"]', 'QA_Earning_Group_01');

// Round Format & Group Function selects - locate by label text within the inline form
const labelSelect = (label) => page.locator(`label:has-text("${label}")`).locator('xpath=following-sibling::select[1]');
await labelSelect('Round Format').selectOption({ label: 'Round Up' });
await labelSelect('Group Function').selectOption({ label: 'Sum' });

// Toggle Yes/No button pairs - use exact row scoping via label + parent
const toggleYes = async (label) => {
  const row = page.locator(`label:has-text("${label}")`).locator('xpath=following-sibling::div[1]');
  await row.locator('button:has-text("Yes")').click();
};
const toggleNo = async (label) => {
  const row = page.locator(`label:has-text("${label}")`).locator('xpath=following-sibling::div[1]');
  await row.locator('button:has-text("No")').click();
};

await toggleYes('Configure On Profile');
await toggleYes('Display On Profile');
await toggleNo('Is Editable');

// Contributed By -> Employer
const contribRow = page.locator('label:has-text("Contributed By")').locator('xpath=following-sibling::div[1]');
await contribRow.locator('button:has-text("Employer")').click();

// Active -> No
await toggleNo('Active');

await toggleYes('Recalculate Payroll On Change');

// Group For Payslip select
await labelSelect('Group For Payslip').selectOption({ label: 'Earnings' });

// Display Order
const displayOrderRow = page.locator('label:has-text("Display Order")').locator('xpath=following-sibling::div[1]//input | following-sibling::input');
await page.locator('label:has-text("Display Order")').locator('xpath=following-sibling::*[1]//input | following-sibling::input[1]').first().fill('42');

await toggleNo('Disable Arrear');
await toggleYes('Display Total On Process');
await toggleYes('TDS deducted same month');
await toggleNo('Taxable');

await page.screenshot({ path: `${outDir}/comp_01_group_filled.png`, fullPage: true });

await page.locator('button:has-text("Update")').first().click();
await page.waitForTimeout(2000);
await page.screenshot({ path: `${outDir}/comp_02_group_saved.png`, fullPage: true });

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${outDir}/comp_03_group_view_after_reload.png`, fullPage: true });

// Click edit pencil on the group to re-open form and inspect persisted values
await page.locator('button[title="Edit Group Settings"]').first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/comp_04_group_edit_after_reload.png`, fullPage: true });

await browser.close();
