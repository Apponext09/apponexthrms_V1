import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1300 } });

const respLog = [];
page.on('response', async resp => {
  if (resp.url().includes('/employees') || resp.url().includes('/payroll/structures/mappings')) {
    let bodySnippet = '';
    try { bodySnippet = (await resp.text()).slice(0, 300); } catch {}
    respLog.push(`${resp.status()} ${resp.request().method()} ${resp.url()} :: ${bodySnippet}`);
  }
});
page.on('pageerror', err => console.log('PAGEERROR:', err.message));

await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[type="email"]', { timeout: 15000 });
await page.fill('input[type="email"]', 'abhishek@gmail.com');
await page.fill('input[type="password"]', 'abhishek@gmail.com');
await page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first().click();
await page.waitForTimeout(3000);

await page.goto('http://localhost:5173/payroll/salary-revision', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
await page.locator('button:has-text("+ Create Salary Revision")').click();
await page.waitForTimeout(6000);

console.log('RESP LOG:', JSON.stringify(respLog, null, 2));
await browser.close();
