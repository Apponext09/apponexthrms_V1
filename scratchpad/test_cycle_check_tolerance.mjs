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

await page.locator('summary:has-text("Tolerance")').click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/cycle_09_tolerance_after_fresh_load.png`, fullPage: true });

await browser.close();
