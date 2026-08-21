import { chromium } from 'playwright';
const outDir = 'scratchpad/screenshots';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1300 } });

const failed = [];
page.on('response', resp => { if (resp.url().includes('salary-revision') || resp.url().includes('structures/assign')) failed.push(`${resp.status()} ${resp.request().method()} ${resp.url()}`); });

await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[type="email"]', { timeout: 15000 });
await page.fill('input[type="email"]', 'abhishek@gmail.com');
await page.fill('input[type="password"]', 'abhishek@gmail.com');
await page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first().click();
await page.waitForTimeout(3000);

await page.goto('http://localhost:5173/payroll/salary-revision', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

await page.locator('button:has-text("+ Create Salary Revision")').click();
await page.waitForTimeout(500);

const empSelect = page.locator('select').first();
await page.waitForFunction(() => {
  const sel = document.querySelectorAll('select')[0];
  return sel && sel.options.length > 1;
}, { timeout: 15000 });

const options = await empSelect.locator('option').allTextContents();
console.log('Employee options count:', options.length, options.slice(0,3));
await empSelect.selectOption({ index: 1 });
await page.waitForTimeout(500);
const empLabel = await empSelect.locator('option:checked').textContent();
console.log('Selected employee:', empLabel);

await page.locator('select').nth(2).selectOption({ label: 'Role Promotion' });
await page.locator('input[type="date"]').fill('2026-09-01');
await page.locator('button:has-text("+15%")').click();
await page.waitForTimeout(300);
const ctcInputVal = await page.locator('input[type="number"]').first().inputValue();
console.log('Proposed CTC after +15% hike:', ctcInputVal);
await page.locator('input[value="Annual compensation review and performance adjustment"]').fill('QA_Test_Revision_Reason');

await page.screenshot({ path: `${outDir}/rev_01_filled.png`, fullPage: true });

await page.locator('button:has-text("Submit Revision Request")').click();
await page.waitForTimeout(2000);
await page.screenshot({ path: `${outDir}/rev_02_after_submit.png`, fullPage: true });

console.log('NETWORK:', JSON.stringify(failed, null, 2));
await browser.close();
