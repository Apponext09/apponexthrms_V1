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

const isOpen = await page.locator('details:has(summary:has-text("Condition Setting"))').evaluate(el => el.open);
console.log('Condition Setting open by default:', isOpen);
if (!isOpen) {
  await page.locator('summary:has-text("Condition Setting")').click();
  await page.waitForTimeout(300);
}
await page.mouse.wheel(0, 900);
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/comp_16_gender_recheck.png`, fullPage: false });

await browser.close();
