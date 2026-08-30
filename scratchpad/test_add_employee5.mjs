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

await page.goto('http://localhost:5173/employees', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.locator('button:has-text("Add Employee")').click();
await page.waitForTimeout(1000);

await page.fill('input[value="EMP001"]', 'QAEMP001');
await page.fill('input[type="email"]', 'qaemp001@example.com');
await page.locator('label:has-text("First Name")').locator('xpath=following-sibling::input[1]').fill('QA');
await page.locator('label:has-text("Last Name")').locator('xpath=following-sibling::input[1]').fill('TestEmployee');
await page.locator('label:has-text("Mobile Number")').locator('xpath=following-sibling::input[1]').fill('9876543210');

await page.locator('text=Personal Info').click();
await page.waitForTimeout(300);
await page.locator('input[placeholder="Min 6 characters"]').fill('Test@1234');
await page.locator('input[placeholder="Confirm password"]').fill('Test@1234');

await page.locator('button:has-text("Create Employee")').click();
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outDir}/addemp_04_result.png`, fullPage: true });

await browser.close();
