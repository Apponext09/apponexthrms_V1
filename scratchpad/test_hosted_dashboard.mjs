import { chromium } from 'playwright';

const outDir = 'scratchpad/hosted';
await import('node:fs').then(fs => fs.mkdirSync(outDir, { recursive: true }));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const consoleErrors = [];
const failedRequests = [];
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + err.message));
page.on('response', resp => { if (resp.status() >= 400) failedRequests.push(`${resp.status()} ${resp.request().method()} ${resp.url()}`); });

try {
  await page.goto('https://hrms.apponext.in/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${outDir}/01_login.png` });
  console.log('LOGIN PAGE URL:', page.url());
} catch (e) {
  console.error('NAV ERROR:', e.message);
}

await browser.close();
