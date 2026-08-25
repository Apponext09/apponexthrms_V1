import { chromium } from 'playwright';
const outDir = 'scratchpad/hosted';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });

await page.goto('https://hrms.apponext.in/login', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[type="email"]', { timeout: 15000 });
await page.fill('input[type="email"]', 'kosqu@gmail.com');
await page.fill('input[type="password"]', 'kosqu@gmail.com');
await page.locator('button:has-text("Sign in")').first().click();
await page.waitForTimeout(3000);

await page.goto('https://hrms.apponext.in/payroll/settings?tab=cycles', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outDir}/cycle_00_initial.png`, fullPage: true });
console.log('URL:', page.url());

// Click "Add New" to open a clean form
const addNewBtn = page.locator('button:has-text("Add New")').first();
if (await addNewBtn.count()) {
  await addNewBtn.click();
  await page.waitForTimeout(500);
}

const testName = 'QA_TestCycle_' + Date.now().toString().slice(-6);

// Field 1: name
await page.fill('input[placeholder="e.g. Monthly, Weekly"]', testName);

// Field 3: frequency -> Semi-Monthly to expose Start Date 1 & 2
await page.selectOption('select >> nth=0', { label: 'Semi-Monthly' }).catch(async()=>{
  console.log('freq select by nth=0 failed, trying alt selector');
});

await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/cycle_01_filled_step1.png`, fullPage: true });

await browser.close();
