import { chromium } from 'playwright';
const outDir = 'scratchpad/hosted';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });

const consoleErrors = [];
page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + err.message));

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

// 1. Payroll Cycle name
const nameInput = fieldInput('Payroll Cycle');
await nameInput.fill(testValues.name);

// 2. Start date
const startInput = fieldInput('Payroll Calculation Start Date');
await startInput.fill(testValues.startDate);

// 3. Cutoff day
const cutoffInput = fieldInput('CutOff Days for Payroll Calculations');
await cutoffInput.fill(testValues.cutoffDay);

// 4. Month dropdown -> Previous Month
const monthSelect = fieldInput('Month');
await monthSelect.selectOption({ label: 'Previous Month' });

// 5. Disbursement date
const dispInput = fieldInput('Payroll Disbursement Date');
await dispInput.fill(testValues.disbursement);

// 6. Total days dropdown -> WorkDays
const totalDaysSelect = fieldInput('Total no. of days for Payroll calculation');
await totalDaysSelect.selectOption({ label: 'WorkDays' });

// 7. Cap amount
const capInput = fieldInput('Payroll Calculation Cap');
await capInput.fill(testValues.cap);

// 8. Active -> No
await page.locator('button:has-text("No")').first().click();

await page.screenshot({ path: `${outDir}/cycle_02_before_save.png`, fullPage: true });

// Save
await page.locator('button:has-text("+ Update"), button:has-text("+ Save Cycle")').first().click();
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outDir}/cycle_03_after_save_toast.png`, fullPage: true });

// Reload fresh to verify persistence from backend (not just local state)
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outDir}/cycle_04_after_reload.png`, fullPage: true });

console.log('TEST VALUES SENT:', JSON.stringify(testValues, null, 2));
console.log('PAGE ERRORS:', JSON.stringify(consoleErrors));

await browser.close();
