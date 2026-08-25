import { chromium } from 'playwright';
const outDir = 'scratchpad/screenshots';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1400 } });

await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[type="email"]', { timeout: 15000 });
await page.fill('input[type="email"]', 'abhishek@gmail.com');
await page.fill('input[type="password"]', 'abhishek@gmail.com');
await page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first().click();
await page.waitForTimeout(3000);

await page.goto('http://localhost:5173/payroll/settings?tab=slabs', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

await page.fill('input[placeholder="e.g. Monthly Senior Slab"]', 'QA_Slab_01');

// Department dropdown
await page.locator('button:has-text("Choose")').first().click();
await page.waitForTimeout(300);
const deptOption = page.locator('div[style*="cursor: pointer"]').filter({ hasText: /./ }).first();
await page.screenshot({ path: `${outDir}/slab_01_dept_open.png`, fullPage: true });

await browser.close();
