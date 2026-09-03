import { chromium } from 'playwright';
const outDir = 'scratchpad/screenshots';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1200 } });

const failed = [];
page.on('response', resp => { if (resp.url().includes('/payroll/settings')) failed.push(`${resp.status()} ${resp.request().method()} ${resp.url()}`); });
page.on('pageerror', err => console.log('PAGEERROR:', err.message));

await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[type="email"]', { timeout: 15000 });
await page.fill('input[type="email"]', 'abhishek@gmail.com');
await page.fill('input[type="password"]', 'abhishek@gmail.com');
await page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first().click();
await page.waitForTimeout(3000);

await page.goto('http://localhost:5173/payroll/settings?tab=settings', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
await page.screenshot({ path: `${outDir}/set_00b_after_wait.png`, fullPage: true });
console.log('SETTINGS RESPONSES:', JSON.stringify(failed, null, 2));

await browser.close();
