import { chromium } from 'playwright';
const outDir = 'scratchpad/screenshots';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const failed = [];
page.on('response', resp => {
  if (resp.status() >= 400) failed.push(`${resp.status()} ${resp.request().method()} ${resp.url()}`);
});

await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[type="email"]', { timeout: 15000 });
await page.fill('input[type="email"]', 'abhishek@gmail.com');
await page.fill('input[type="password"]', 'abhishek@gmail.com');
await page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first().click();
await page.waitForTimeout(3000);

await page.goto('http://localhost:5173/payroll', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

console.log('FAILED REQUESTS:');
failed.forEach(f => console.log(f));
await browser.close();
