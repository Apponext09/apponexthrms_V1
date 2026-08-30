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

// Try common payroll dashboard paths, in scope order
const candidates = ['/payroll', '/hr/payroll'];
let landed = null;
for (const path of candidates) {
  await page.goto(`https://hrms.apponext.in${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(()=>{});
  await page.waitForTimeout(2500);
  const url = page.url();
  const bodyText = await page.locator('body').innerText().catch(()=> '');
  if (!/page not found/i.test(bodyText) && !/404/.test(bodyText.slice(0,50))) {
    landed = path;
    break;
  }
}
console.log('Landed path:', landed, 'final URL:', page.url());
await page.screenshot({ path: `${outDir}/05_payroll_dashboard.png`, fullPage: true });
console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrors, null, 2));
console.log('FAILED REQUESTS:', JSON.stringify(failedRequests, null, 2));

await browser.close();
