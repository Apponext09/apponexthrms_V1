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

await page.goto('http://localhost:5173/payroll/settings?tab=settings', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);

// Section 1: Payment Status
await page.locator('input[value="Pending"]').fill('QA_Pending_X');

// Section 2: Approval
await page.locator('select').nth(0).selectOption({ label: 'Multi Level' });
await page.locator('text=Require approval before publish').locator('xpath=preceding-sibling::button[1]').click();
await page.locator('input[value="HR Review"]').fill('QA_HR_Review_Step');

// Section 3: Process Payroll Tabs
await page.locator('text=Attendance Review').locator('xpath=following-sibling::button[1]').click();

// Section 4: Checklist
await page.locator('input[value="Bank details verified for all employees"]').locator('xpath=following-sibling::label[1]//input').check();
await page.locator('button:has-text("Add Checklist Item")').click();
await page.waitForTimeout(200);
await page.locator('input[value="New checklist item"]').fill('QA_Checklist_Item');

// Section 5: Attendance & Pay Rules
const freezeInput = page.locator('label:has-text("Freeze Attendance")').locator('xpath=following-sibling::input[1]');
await freezeInput.fill('20');
const massPaidInput = page.locator('label:has-text("Mass Paid Days")').locator('xpath=following-sibling::input[1]');
await massPaidInput.fill('5');
await page.locator('label:has-text("Double Pay Inclusive")').locator('xpath=following-sibling::button[1]').click();
await page.locator('label:has-text("Sandwich Policy")').locator('xpath=following-sibling::button[1]').click();

await page.screenshot({ path: `${outDir}/set_03_section5.png`, fullPage: true });

// Section 6: ESIC
await page.locator('label:has-text("Calculation Base")').locator('xpath=following-sibling::select[1]').selectOption({ label: 'Fixed Gross' });
await page.locator('label:has-text("Wage Ceiling")').locator('xpath=following-sibling::input[1]').fill('25000');

// Section 7: Loan Setting
await page.locator('label:has-text("Max Loan")').locator('xpath=following-sibling::input[1]').fill('15');
await page.locator('label:has-text("Max Tenure")').locator('xpath=following-sibling::input[1]').fill('48');
await page.locator('label:has-text("Interest Rate")').locator('xpath=following-sibling::input[1]').fill('7.5');
await page.locator('label:has-text("Min Service")').locator('xpath=following-sibling::input[1]').fill('12');

// Section 8: Payslip Setting
await page.locator('text=Show Leave Balance').locator('xpath=following-sibling::button[1]').click();
await page.locator('text=Show Company Logo').locator('xpath=following-sibling::button[1]').click();
await page.locator('label:has-text("Footer Note")').locator('xpath=following-sibling::input[1]').fill('QA_Footer_Note_Text');
await page.locator('label:has-text("Hide Payroll Component")').locator('input[type="checkbox"]').check();
await page.locator('label:has-text("Display actual values")').locator('input[type="checkbox"]').check();
await page.locator('label:has-text("Display Cumulative values")').locator('input[type="checkbox"]').check();
await page.locator('label:has-text("Display Total Amount")').locator('input[type="checkbox"]').check();
await page.locator('label:has-text("Enable Landscape Format")').locator('input[type="checkbox"]').check();
await page.locator('label:has-text("Label for Gross Salary")').locator('xpath=following-sibling::input[1]').fill('QA_GrossLabel');
await page.locator('label:has-text("Label for Gross Earned Salary")').locator('xpath=following-sibling::input[1]').fill('QA_EarnedLabel');
await page.locator('label:has-text("Label for Cumulative Salary")').locator('xpath=following-sibling::input[1]').fill('QA_CumulativeLabel');
await page.locator('label:has-text("Label for Earning Component")').locator('xpath=following-sibling::input[1]').fill('QA_EarningsLabel');
await page.locator('label:has-text("Label for Deduction Component")').locator('xpath=following-sibling::input[1]').fill('QA_DeductionsLabel');
await page.locator('label:has-text("Employee Signature Field Name")').locator('xpath=following-sibling::input[1]').fill('QA_SignatureLabel');

// Section 9: Bonus / Attendance Bonus / Night Allowance
await page.locator('span:has-text("Bonus")').first().locator('xpath=following-sibling::button[1]').click();
await page.waitForTimeout(200);
await page.locator('label:has-text("Percentage")').locator('xpath=following-sibling::input[1]').fill('8.5');

await page.locator('span:has-text("Attendance Bonus")').first().locator('xpath=following-sibling::button[1]').click();
await page.waitForTimeout(200);
await page.locator('label:has-text("Amount (₹)")').locator('xpath=following-sibling::input[1]').fill('1500');
await page.locator('label:has-text("Min Attendance")').locator('xpath=following-sibling::input[1]').fill('90');

await page.locator('span:has-text("Night Allowance")').first().locator('xpath=following-sibling::button[1]').click();
await page.waitForTimeout(200);
await page.locator('label:has-text("Amount / Night")').locator('xpath=following-sibling::input[1]').fill('300');
await page.locator('label:has-text("Shift Start")').locator('xpath=following-sibling::input[1]').fill('21');
await page.locator('label:has-text("Shift End")').locator('xpath=following-sibling::input[1]').fill('5');

await page.screenshot({ path: `${outDir}/set_04_all_filled.png`, fullPage: true });

// Save
await page.locator('button:has-text("Save Settings")').click();
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outDir}/set_05_after_save.png`, fullPage: true });

// Reload fresh
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
await page.screenshot({ path: `${outDir}/set_06_after_reload_top.png`, fullPage: true });

await browser.close();
