import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SS = __dirname;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();

page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });

await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1000);

const emailInput = page.locator('input[type="email"], input[name="email"]').first();
const passInput = page.locator('input[type="password"]').first();
await emailInput.fill('emp2@gmail.com');
await passInput.fill('emp2@gmail.com');
await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first().click();
await page.waitForTimeout(3000);
console.log('Post login URL:', page.url());
await page.screenshot({ path: `${SS}/11a_employee_login_attempt.png` });

const bodyText = await page.locator('body').innerText();
console.log(bodyText.slice(0, 400));

await browser.close();
