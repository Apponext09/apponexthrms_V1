import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SS = __dirname;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, storageState: `${SS}/authState.json` });
const page = await context.newPage();

page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

await page.goto('http://localhost:5173/employees', { waitUntil: 'networkidle', timeout: 30000 }).catch(async () => {
  await page.goto('http://localhost:5173/hr/employees', { waitUntil: 'networkidle', timeout: 30000 });
});
await page.waitForTimeout(2000);
console.log('URL:', page.url());
await page.screenshot({ path: `${SS}/24a_employees_list.png`, fullPage: true });

// Click on the first employee row/link
const empLink = page.locator('a, tr, [role="button"]').filter({ hasText: 'Aarav' }).first();
const empCount = await page.locator('text=Aarav Mehta').count();
console.log('Aarav Mehta text found:', empCount);
if (empCount > 0) {
  await page.locator('text=Aarav Mehta').first().click();
  await page.waitForTimeout(2500);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  console.log('Profile URL:', page.url());
  await page.screenshot({ path: `${SS}/24b_employee_profile.png`, fullPage: true });

  // Look for a "Payroll" tab on the profile
  const payrollTabCount = await page.locator('button:has-text("Payroll"), a:has-text("Payroll"), [role="tab"]:has-text("Payroll")').count();
  console.log('Payroll tab found:', payrollTabCount);
  if (payrollTabCount > 0) {
    await page.locator('button:has-text("Payroll"), a:has-text("Payroll"), [role="tab"]:has-text("Payroll")').first().click();
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.screenshot({ path: `${SS}/24c_employee_payroll_tab.png`, fullPage: true });
    const bodyText = await page.locator('body').innerText();
    const idx = bodyText.indexOf('Slab');
    console.log('=== Payroll tab text near Slab ===');
    console.log(bodyText.slice(Math.max(0, idx - 300), idx + 800));
  }
}

await browser.close();
