import { chromium } from 'playwright';
const outDir = 'scratchpad/screenshots';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1150 } });

await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[type="email"]', { timeout: 15000 });
await page.fill('input[type="email"]', 'abhishek@gmail.com');
await page.fill('input[type="password"]', 'abhishek@gmail.com');
await page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first().click();
await page.waitForTimeout(3000);

await page.goto('http://localhost:5173/payroll/settings?tab=cycles', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

const fieldInput = (label) => page.locator(`label:has-text("${label}")`).locator('xpath=following-sibling::div[1]//input | following-sibling::div[1]//select').first();

const values = {
  name: 'QA_Local_Cycle_01',
  startDate: '5',
  cutoffDay: '20',
  disbursement: '24',
  cap: '555555.25'
};

await fieldInput('Payroll Cycle').fill(values.name);

// Daily wages + sub-checkboxes
const dailyWagesRow = page.locator('label:has-text("Daily wages")').first().locator('xpath=following-sibling::div[1]');
await dailyWagesRow.locator('input[type="checkbox"]').check();
await page.waitForTimeout(300);
const paidHolidaysRow = page.locator('label:has-text("Daily wages include paid holidays")').locator('xpath=following-sibling::div[1]');
await paidHolidaysRow.locator('input[type="checkbox"]').check();
const weekOffRow = page.locator('label:has-text("Daily wages include week off")').locator('xpath=following-sibling::div[1]');
await weekOffRow.locator('input[type="checkbox"]').check();

// Frequency stays Monthly
await fieldInput('Payroll Calculation Start Date').fill(values.startDate);
await fieldInput('CutOff Days for Payroll Calculations').fill(values.cutoffDay);
await fieldInput('Month').selectOption({ label: 'Previous Month' });

// Tolerance
await page.locator('summary:has-text("Tolerance")').click();
await page.waitForTimeout(300);
const toleranceCheckbox = page.locator('text=Enable Attendance Tolerance Minutes').locator('xpath=preceding-sibling::input[1]');
await toleranceCheckbox.check();
const toleranceMinutesInput = page.locator('label:has-text("Tolerance (Minutes)")').locator('xpath=following-sibling::input[1]');
await toleranceMinutesInput.fill('40');

await fieldInput('Payroll Disbursement Date').fill(values.disbursement);
await fieldInput('Total no. of days for Payroll calculation').selectOption({ label: 'WorkDays' });
await fieldInput('Payroll Calculation Cap').fill(values.cap);

// Active -> No
const activeRow = page.locator('label:has-text("Active")').locator('xpath=following-sibling::div[1]');
await activeRow.locator('button:has-text("No")').click();

await page.screenshot({ path: `${outDir}/local_cycle_01_filled.png`, fullPage: true });

const saveBtn = page.getByRole('button', { name: '+ Save Cycle' });
await saveBtn.click();
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outDir}/local_cycle_02_after_save.png`, fullPage: true });

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
// Expand tolerance again post reload (details closed by default)
await page.locator('summary:has-text("Tolerance")').click().catch(()=>{});
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/local_cycle_03_after_reload.png`, fullPage: true });

console.log('VALUES SENT:', JSON.stringify(values, null, 2));
await browser.close();
