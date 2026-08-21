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

await page.locator('input[value="Pending"]').fill('QA_Pending_X');
const approvalModeSelect = page.locator('select').nth(0);
await approvalModeSelect.selectOption({ label: 'Multi Level' });
const requireApprovalToggle = page.locator('text=Require approval before publish').locator('xpath=preceding-sibling::button[1]');
await requireApprovalToggle.click();
await page.locator('input[value="HR Review"]').fill('QA_HR_Review_Step');
await page.locator('text=Attendance Review').locator('xpath=following-sibling::button[1]').click();

// Checklist: toggle "Bank details verified" mandatory ON, add new item
await page.locator('input[value="Bank details verified for all employees"]').locator('xpath=following-sibling::label[1]//input').check();
await page.locator('button:has-text("Add Checklist Item")').click();
await page.waitForTimeout(300);
const newChecklistInput = page.locator('input[value="New checklist item"]');
await newChecklistInput.fill('QA_Checklist_Item');

await page.mouse.wheel(0, 800);
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/set_02_scroll1.png`, fullPage: true });

await browser.close();
