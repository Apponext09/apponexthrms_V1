import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("Assign Slab")').first().click();
  await page.waitForTimeout(1800);

  const searchBox = page.locator('input[placeholder*="Search staff" i]').first();
  await searchBox.fill('EMP012');
  await page.waitForTimeout(1200);
  let t = await page.innerText('body');
  console.log('=== SEARCH EMP012 ===');
  console.log(t.slice(t.indexOf('EMPLOYEE DETAILS')-100, t.indexOf('EMPLOYEE DETAILS')+1500));

  await searchBox.fill('');
  await page.waitForTimeout(500);
  // click Assigned Only filter to see who already has a slab
  await page.locator('text=Assigned Only').first().click();
  await page.waitForTimeout(1200);
  t = await page.innerText('body');
  console.log('=== ASSIGNED ONLY ===');
  console.log(t.slice(t.indexOf('EMPLOYEE DETAILS')-100, t.indexOf('EMPLOYEE DETAILS')+2500));
  await page.screenshot({ path: SS + '06g-assigned-only.png', fullPage: true });
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
