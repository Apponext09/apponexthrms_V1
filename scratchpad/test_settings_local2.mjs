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

// 1. Payment Status: change first label "Pending" -> "QA_Pending_X"
const statusInputs = page.locator('div:has(> span.rounded-full) input').first();
await page.locator('input[value="Pending"]').fill('QA_Pending_X');

// 2. Approval mode -> Multi Level, and ensure toggle is ON (it's already on, toggle off then on to test)
await page.locator('select').filter({ hasText: '' }).first();
const approvalModeSelect = page.locator('select').nth(0);
await approvalModeSelect.selectOption({ label: 'Multi Level' });

// toggle "Require approval before publish" off
await page.locator('button:below(:text("Approval Mode"))').first();
const requireApprovalToggle = page.locator('text=Require approval before publish').locator('xpath=preceding-sibling::button[1]');
await requireApprovalToggle.click();

// Edit approval level 1 name
await page.locator('input[value="HR Review"]').fill('QA_HR_Review_Step');

// 3. Process Payroll Tab - toggle "Attendance Review" off
await page.mouse.wheel(0, 500);
await page.waitForTimeout(300);
await page.locator('text=Attendance Review').locator('xpath=following-sibling::button[1]').click();

await page.screenshot({ path: `${outDir}/set_01_section1_filled.png`, fullPage: true });

await browser.close();
