import { chromium } from 'playwright';
const outDir = 'scratchpad/screenshots';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });

await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[type="email"]', { timeout: 15000 });
await page.fill('input[type="email"]', 'abhishek@gmail.com');
await page.fill('input[type="password"]', 'abhishek@gmail.com');
await page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first().click();
await page.waitForTimeout(3000);

await page.goto('http://localhost:5173/payroll/settings?tab=components', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.locator('span:has-text("QA_Component_01")').first().click();
await page.waitForTimeout(500);
await page.locator('summary:has-text("Condition Setting")').first().click().catch(()=>{});
await page.waitForTimeout(300);
await page.mouse.wheel(0, 900);
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/comp_15_gender_check.png`, fullPage: false });

await browser.close();
