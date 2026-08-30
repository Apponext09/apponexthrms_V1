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

await page.goto('http://localhost:5173/dashboard', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.locator('text=Employee').first().click().catch(()=>{});
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outDir}/emp_check_00.png`, fullPage: true });
console.log('URL:', page.url());

await browser.close();
