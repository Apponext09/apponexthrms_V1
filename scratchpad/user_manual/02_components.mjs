import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1100 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("Components Catalog")').first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SS + '02a-components-catalog-earning.png', fullPage: true });

  const bodyText = await page.innerText('body');
  console.log('=== COMPONENTS CATALOG (Earning) ===');
  console.log(bodyText.slice(bodyText.indexOf('Components Catalog'), bodyText.indexOf('Components Catalog')+2500));

  // Click on a component e.g. Basic to open edit form
  const rows = await page.$$eval('table tbody tr, [class*="list"] > div, li', els => els.slice(0,30).map(e=>e.innerText.trim()).filter(Boolean));
  console.log('ROWS SAMPLE:', JSON.stringify(rows.slice(0,20)));

  // Try clicking "Basic" component
  const basicLoc = page.locator('text=Basic').first();
  if (await basicLoc.count() > 0) {
    await basicLoc.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: SS + '02b-basic-component-edit.png', fullPage: true });
    const editText = await page.innerText('body');
    console.log('=== BASIC EDIT FORM ===');
    console.log(editText.slice(0, 3500));
  }

  // Switch to Deduction sub-tab
  await page.locator('button:has-text("Deduction")').first().click().catch(async()=>{ await page.click('text=Deduction'); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: SS + '02c-components-catalog-deduction.png', fullPage: true });

} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
