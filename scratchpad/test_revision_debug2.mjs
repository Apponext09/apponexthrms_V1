import { chromium } from 'playwright';
const outDir = 'scratchpad/screenshots';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1300 } });
page.on('pageerror', err => console.log('PAGEERROR:', err.message));
page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERR:', msg.text()); });

await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[type="email"]', { timeout: 15000 });
await page.fill('input[type="email"]', 'abhishek@gmail.com');
await page.fill('input[type="password"]', 'abhishek@gmail.com');
await page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first().click();
await page.waitForTimeout(3000);

await page.goto('http://localhost:5173/payroll/salary-revision', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
await page.locator('button:has-text("+ Create Salary Revision")').click();
await page.waitForTimeout(5000);
await page.screenshot({ path: `${outDir}/rev_debug_01.png`, fullPage: true });

const selectHtml = await page.locator('select').first().evaluate(el => el.outerHTML.slice(0, 500));
console.log('SELECT HTML:', selectHtml);

await browser.close();
