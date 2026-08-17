import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SS = __dirname;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();

page.on('console', msg => {
  if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
});
page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

console.log('Navigating to app...');
await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
await page.screenshot({ path: `${SS}/00_landing.png` });
console.log('Landing URL:', page.url());

await page.waitForTimeout(1000);
const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail" i]').first();
const passInput = page.locator('input[type="password"]').first();

if (await emailInput.count() > 0) {
  await emailInput.fill('shakya@gmail.com');
  await passInput.fill('shakya@gmail.com');
  await page.screenshot({ path: `${SS}/00b_login_filled.png` });
  const loginBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
  await loginBtn.click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
} else {
  console.log('No login form found, maybe already logged in or different page');
}

console.log('Post-login URL:', page.url());
await page.screenshot({ path: `${SS}/01_dashboard.png`, fullPage: true });

await context.storageState({ path: `${SS}/authState.json` });
console.log('Saved auth state.');

await browser.close();
