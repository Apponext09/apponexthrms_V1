import { chromium } from 'playwright';

const outDir = 'scratchpad/hosted';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const consoleErrors = [];
const failedRequests = [];
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + err.message));
page.on('response', resp => { if (resp.status() >= 400) failedRequests.push(`${resp.status()} ${resp.request().method()} ${resp.url()}`); });

await page.goto('https://hrms.apponext.in/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 15000 });

await page.fill('input[type="email"], input[name="email"]', 'kosqu@gmail.com');
await page.fill('input[type="password"], input[name="password"]', 'kosqu@gmail.com');

await page.locator('button:has-text("Sign in")').first().click();
await page.waitForTimeout(3000);
console.log('URL after login attempt:', page.url());
await page.screenshot({ path: `${outDir}/04_after_login2.png` });
console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrors));
console.log('FAILED REQUESTS:', JSON.stringify(failedRequests, null, 2));

await browser.close();
