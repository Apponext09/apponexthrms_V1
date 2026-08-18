import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SS = __dirname;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();

page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
const netLog = [];
page.on('response', res => { if (res.url().includes('/api/')) netLog.push(`${res.status()} ${res.request().method()} ${res.url()}`); });

await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1000);
await page.locator('input[type="email"]').first().fill('emp2@gmail.com');
await page.locator('input[type="password"]').first().fill('emp2@gmail.com');
await page.locator('button[type="submit"], button:has-text("Login")').first().click();
await page.waitForTimeout(2500);

await page.goto('http://localhost:5173/manager/loans', { waitUntil: 'networkidle', timeout: 30000 }).catch(e => console.log('nav err', e.message));
await page.waitForTimeout(2000);
console.log('URL:', page.url());
await page.screenshot({ path: `${SS}/12a_employee_loan_page.png`, fullPage: true });

const bodyText = await page.locator('body').innerText();
console.log(bodyText.slice(0, 2500));

await context.storageState({ path: `${SS}/authState_employee.json` });
await browser.close();
