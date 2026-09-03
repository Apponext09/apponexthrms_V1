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

// Enable Daily wages
const dailyWagesRow = page.locator('label:has-text("Daily wages")').first().locator('xpath=following-sibling::div[1]');
await dailyWagesRow.locator('input[type="checkbox"]').check();
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/cycle_05_daily_wages_expanded.png`, fullPage: true });

// Expand Tolerance
const toleranceSummary = page.locator('summary:has-text("Tolerance")');
await toleranceSummary.click();
await page.waitForTimeout(300);
const toleranceCheckbox = page.locator('text=Enable Attendance Tolerance Minutes').locator('xpath=preceding-sibling::input[1]');
await toleranceCheckbox.check().catch(async () => {
  console.log('tolerance checkbox alt selector needed');
});
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/cycle_06_tolerance_expanded.png`, fullPage: true });

const toleranceMinutesInput = page.locator('label:has-text("Tolerance (Minutes)")').locator('xpath=following-sibling::input[1]');
if (await toleranceMinutesInput.count()) {
  await toleranceMinutesInput.fill('45');
}
await page.screenshot({ path: `${outDir}/cycle_07_before_save2.png`, fullPage: true });

const updateBtn = page.getByRole('button', { name: '+ Update' });
await updateBtn.click();
await page.waitForTimeout(2500);

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outDir}/cycle_08_after_reload2.png`, fullPage: true });

await browser.close();
