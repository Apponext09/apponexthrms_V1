import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1100 }, storageState: STATE });
const page = await context.newPage();
page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

try {
  await page.goto('http://localhost:5173/payroll/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("Cycles")').first().click();
  await page.waitForTimeout(1500);

  // expand tolerance section
  await page.locator('text=[+] Tolerance').first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: SS + '01c-cycle-tolerance-expanded.png', fullPage: true });
  const t = await page.innerText('body');
  console.log('TOLERANCE SECTION:', t.slice(t.indexOf('Tolerance'), t.indexOf('Tolerance')+500));

  // Click on the test cycle to edit it
  await page.locator('text=QA_ROUND3_TEST_CYCLE').first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: SS + '01d-test-cycle-before-edit.png', fullPage: true });

  // read current cap value
  const capInput = page.locator('input').filter({ hasNot: page.locator('[type=checkbox]') });
  // find by label proximity - locate the input near "Payroll Calculation Cap" label
  const capLabel = page.locator('text=Payroll Calculation Cap');
  const capField = capLabel.locator('xpath=ancestor::div[contains(@class,"") ][1]//input').first();
  let before = null;
  try { before = await page.locator('label:has-text("Payroll Calculation Cap")').locator('xpath=following::input[1]').inputValue(); } catch(e) { console.log('cap read err', e.message); }
  console.log('CAP BEFORE:', before);

  const capFieldLoc = page.locator('label:has-text("Payroll Calculation Cap")').locator('xpath=following::input[1]');
  await capFieldLoc.fill('555555');
  await page.waitForTimeout(300);
  await page.screenshot({ path: SS + '01e-test-cycle-edited-value.png', fullPage: true });

  await page.locator('button:has-text("Update")').first().click();
  await page.waitForTimeout(2500);
  await page.waitForLoadState('networkidle', {timeout:10000}).catch(()=>{});
  await page.screenshot({ path: SS + '01f-test-cycle-after-save.png', fullPage: true });
  const afterSaveText = await page.innerText('body');
  console.log('AFTER SAVE TOAST-ish:', afterSaveText.match(/(success|updated|error|failed)[^\n]{0,100}/gi));

  // reload page fresh to confirm persistence
  await page.goto('http://localhost:5173/payroll/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Cycles")').first().click();
  await page.waitForTimeout(1000);
  await page.locator('text=QA_ROUND3_TEST_CYCLE').first().click();
  await page.waitForTimeout(1200);
  const capAfterReload = await page.locator('label:has-text("Payroll Calculation Cap")').locator('xpath=following::input[1]').inputValue();
  console.log('CAP AFTER RELOAD:', capAfterReload);
  await page.screenshot({ path: SS + '01g-test-cycle-after-reload.png', fullPage: true });

} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
