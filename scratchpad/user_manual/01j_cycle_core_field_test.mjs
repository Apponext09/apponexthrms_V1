import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1100 }, storageState: STATE });
const page = await context.newPage();
page.on('dialog', async d => { await d.accept(); });

try {
  await page.goto('http://localhost:5173/payroll/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("Cycles")').first().click();
  await page.waitForTimeout(1200);
  await page.locator('text=QA_ROUND3_TEST_CYCLE').first().click();
  await page.waitForTimeout(1200);

  const cutoffField = page.locator('label:has-text("CutOff Days for Payroll Calculations")').locator('xpath=following::input[1]');
  await cutoffField.fill('22');
  await page.locator('button:has-text("Update")').first().click();
  await page.waitForTimeout(2500);

  await page.goto('http://localhost:5173/payroll/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Cycles")').first().click();
  await page.waitForTimeout(1000);
  await page.locator('text=QA_ROUND3_TEST_CYCLE').first().click();
  await page.waitForTimeout(1200);
  const cutoffAfter = await page.locator('label:has-text("CutOff Days for Payroll Calculations")').locator('xpath=following::input[1]').inputValue();
  console.log('CUTOFF AFTER RELOAD (expect 22):', cutoffAfter);

  // revert back to 25 to leave test data clean
  const cutoffField2 = page.locator('label:has-text("CutOff Days for Payroll Calculations")').locator('xpath=following::input[1]');
  await cutoffField2.fill('25');
  await page.locator('button:has-text("Update")').first().click();
  await page.waitForTimeout(2000);
  console.log('Reverted cutoff back to 25');
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
