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
await page.locator('text=Personal Info').click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/addemp_03_personal.png`, fullPage: true });

await browser.close();
