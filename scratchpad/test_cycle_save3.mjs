import { chromium } from 'playwright';
const outDir = 'scratchpad/hosted';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });

await page.goto('https://hrms.apponext.in/login', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[type="email"]', { timeout: 15000 });
await page.fill('input[type="email"]', 'kosqu@gmail.com');
await page.fill('input[type="password"]', 'kosqu@gmail.com');
await page.locator('button:has-text("Sign in")').first().click();
await page.waitForTimeout(3000);

await page.goto('https://hrms.apponext.in/payroll/settings?tab=cycles', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

const fieldInput = (label) => page.locator(`label:has-text("${label}")`).locator('xpath=following-sibling::div[1]//input | following-sibling::div[1]//select').first();

const testSuffix = Date.now().toString().slice(-5);
const testValues = {
  name: `monthly_edit_${testSuffix}`,
  startDate: '3',
  cutoffDay: '22',
  disbursement: '26',
  cap: '888888.50'
};

await fieldInput('Payroll Cycle').fill(testValues.name);
await fieldInput('Payroll Calculation Start Date').fill(testValues.startDate);
await fieldInput('CutOff Days for Payroll Calculations').fill(testValues.cutoffDay);
await fieldInput('Month').selectOption({ label: 'Previous Month' });
await fieldInput('Payroll Disbursement Date').fill(testValues.disbursement);
await fieldInput('Total no. of days for Payroll calculation').selectOption({ label: 'WorkDays' });
await fieldInput('Payroll Calculation Cap').fill(testValues.cap);

// Active toggle - scope strictly to the Active row
const activeRow = page.locator('label:has-text("Active")').locator('xpath=following-sibling::div[1]');
await activeRow.locator('button:has-text("No")').click();

await page.screenshot({ path: `${outDir}/cycle_02b_before_save.png`, fullPage: true });

const updateBtn = page.getByRole('button', { name: '+ Update' });
await updateBtn.waitFor({ state: 'visible', timeout: 10000 });
await updateBtn.click();
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outDir}/cycle_03b_after_save.png`, fullPage: true });

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outDir}/cycle_04b_after_reload.png`, fullPage: true });

console.log('TEST VALUES SENT:', JSON.stringify(testValues, null, 2));

await browser.close();
