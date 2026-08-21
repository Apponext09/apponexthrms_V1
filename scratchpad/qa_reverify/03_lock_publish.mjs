import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SS = __dirname;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, storageState: `${SS}/authState.json` });
const page = await context.newPage();

const netLog = [];
page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
page.on('response', res => {
  if (res.url().includes('/api/') && (res.request().method() !== 'GET' || res.status() >= 400)) {
    netLog.push(`${res.status()} ${res.request().method()} ${res.url()}`);
  }
});

await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

const lockBtn = page.locator('button:has-text("2. Lock Figures")').first();
const publishBtn = page.locator('button:has-text("3. Publish Payslips")').first();

console.log('Lock button disabled?', await lockBtn.isDisabled().catch(e => 'ERR:' + e.message));
console.log('Publish button disabled?', await publishBtn.isDisabled().catch(e => 'ERR:' + e.message));
console.log('Run status text:', await page.locator('text=/Run #\\d+/').first().textContent().catch(() => 'n/a'));

await page.screenshot({ path: `${SS}/03a_before_lock.png`, fullPage: false });

// Click Lock Figures if enabled
const lockDisabled = await lockBtn.isDisabled().catch(() => true);
if (!lockDisabled) {
  console.log('Clicking Lock Figures...');
  page.once('dialog', async d => { console.log('DIALOG on lock:', d.message()); await d.accept(); });
  await lockBtn.click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.screenshot({ path: `${SS}/03b_after_lock.png`, fullPage: false });
} else {
  console.log('Lock button was disabled, skipping click.');
}

await page.waitForTimeout(1000);
console.log('Publish button disabled after lock attempt?', await publishBtn.isDisabled().catch(e => 'ERR:' + e.message));

const publishDisabled = await publishBtn.isDisabled().catch(() => true);
if (!publishDisabled) {
  console.log('Clicking Publish Payslips...');
  page.once('dialog', async d => { console.log('DIALOG on publish:', d.message()); await d.accept(); });
  await publishBtn.click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.screenshot({ path: `${SS}/03c_after_publish.png`, fullPage: false });
} else {
  console.log('Publish button was disabled, skipping click.');
}

await page.waitForTimeout(1000);
await page.screenshot({ path: `${SS}/03d_final_state.png`, fullPage: false });

console.log('--- Non-GET / error API calls during this flow ---');
console.log(netLog.join('\n'));

await browser.close();
