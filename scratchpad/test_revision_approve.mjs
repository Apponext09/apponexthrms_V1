import { chromium } from 'playwright';
const outDir = 'scratchpad/screenshots';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1300 } });

const netlog = [];
page.on('response', resp => { if (resp.url().includes('salary-revision') || resp.url().includes('structures/assign')) netlog.push(`${resp.status()} ${resp.request().method()} ${resp.url()}`); });

await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[type="email"]', { timeout: 15000 });
await page.fill('input[type="email"]', 'abhishek@gmail.com');
await page.fill('input[type="password"]', 'abhishek@gmail.com');
await page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first().click();
await page.waitForTimeout(3000);

await page.goto('http://localhost:5173/payroll/salary-revision', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

await page.locator('button:has-text("Approve")').click();
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outDir}/rev_06_after_approve.png`, fullPage: true });

console.log('NETWORK:', JSON.stringify(netlog, null, 2));

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outDir}/rev_07_after_approve_reload.png`, fullPage: true });

await browser.close();
