import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Components Catalog")').first().click();
  await page.waitForTimeout(1200);
  await page.locator('text=Basic').first().click();
  await page.waitForTimeout(800);

  // click edit pencil on row containing VALUE type (the second data row)
  const rows = page.locator('table tbody tr');
  const n = await rows.count();
  console.log('rows in Basic group table:', n);
  for (let i=0;i<n;i++){
    const txt = await rows.nth(i).innerText();
    console.log(i, txt.replace(/\n/g,' | '));
  }
  // the VALUE row should be index 1
  await rows.nth(1).locator('button').first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: SS + '03a-value-type-component.png', fullPage: true });

  // now go to Deduction tab, find "Provident Fund" group, look for MODULE type component
  await page.locator('button:has-text("Return to View Mode")').first().click().catch(()=>{});
  await page.waitForTimeout(500);
  await page.locator('button:has-text("Deduction")').first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: SS + '03d-deduction-groups-list.png', fullPage: true });
  const dedText = await page.innerText('body');
  console.log('=== DEDUCTION GROUPS ===');
  console.log(dedText.slice(dedText.indexOf('Deduction Group'), dedText.indexOf('Deduction Group')+1500));

} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
