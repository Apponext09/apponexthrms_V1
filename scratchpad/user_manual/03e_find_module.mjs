import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1200 }, storageState: STATE });
const page = await context.newPage();

const candidates = ['LOP', 'Professional Tax', 'Salary Days', 'OT'];

try {
  await page.goto('http://localhost:5173/payroll/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Components Catalog")').first().click();
  await page.waitForTimeout(1000);
  await page.locator('button:has-text("Deduction")').first().click();
  await page.waitForTimeout(1000);

  for (const name of ['LOP', 'Professional Tax']) {
    await page.locator(`text=${name}`).first().click();
    await page.waitForTimeout(700);
    const rows = page.locator('table tbody tr');
    const n = await rows.count();
    for (let i=0;i<n;i++){
      console.log(name, i, (await rows.nth(i).innerText()).replace(/\n/g,' | '));
    }
  }

  await page.locator('button:has-text("Earning")').first().click();
  await page.waitForTimeout(1000);
  for (const name of ['Salary Days', 'OT']) {
    await page.locator(`text=${name}`).first().click();
    await page.waitForTimeout(700);
    const rows = page.locator('table tbody tr');
    const n = await rows.count();
    for (let i=0;i<n;i++){
      console.log(name, i, (await rows.nth(i).innerText()).replace(/\n/g,' | '));
    }
  }
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
