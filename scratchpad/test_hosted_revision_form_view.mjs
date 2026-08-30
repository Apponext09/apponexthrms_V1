import { chromium } from 'playwright';
const outDir = 'scratchpad/hosted';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1300 } });

const consoleErrors = [];
const failedRequests = [];
page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + err.message));
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('response', resp => { if (resp.status() >= 400) failedRequests.push(`${resp.status()} ${resp.request().method()} ${resp.url()}`); });

await page.goto('https://hrms.apponext.in/login', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[type="email"]', { timeout: 15000 });
await page.fill('input[type="email"]', 'kosqu@gmail.com');
await page.fill('input[type="password"]', 'kosqu@gmail.com');
await page.locator('button:has-text("Sign in")').first().click();
await page.waitForTimeout(3000);

await page.goto('https://hrms.apponext.in/payroll/salary-revision', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

await page.locator('button:has-text("+ Create Salary Revision")').click();
await page.waitForTimeout(3000);
await page.screenshot({ path: `${outDir}/rev_hosted_01_form.png`, fullPage: true });

// Read-only inspection: check employee dropdown options count, current CTC display, quick-hike behavior visually (no submit)
const empSelect = page.locator('select').first();
const empOptions = await empSelect.locator('option').allTextContents();
console.log('Employee options count:', empOptions.length);
console.log('Sample options:', empOptions.slice(0, 5));

console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrors));
console.log('FAILED REQUESTS:', JSON.stringify(failedRequests, null, 2));

await browser.close();
