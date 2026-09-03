import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1100 }, storageState: STATE });
const page = await context.newPage();
page.on('dialog', async d => { await d.accept(); });

const apiLog = [];
page.on('response', async (res) => {
  const url = res.url();
  const method = res.request().method();
  if (url.includes('127.0.0.1:5000') && url.includes('component') && (method==='PUT'||method==='PATCH'||method==='POST')) {
    let body = null; try { body = await res.json(); } catch {}
    apiLog.push({ url, method, status: res.status(), body });
  }
});

async function openBasic50(page) {
  await page.goto('http://localhost:5173/payroll/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Components Catalog")').first().click();
  await page.waitForTimeout(1200);
  await page.locator('text=Basic').first().click();
  await page.waitForTimeout(800);
  const row = page.locator('tr', { hasText: 'Basic 50%' });
  await row.locator('button, a').first().click();
  await page.waitForTimeout(1200);
}

try {
  await openBasic50(page);
  await page.screenshot({ path: SS + '02k-before-condition-edit.png', fullPage: true });
  const before = await page.innerText('body');
  console.log('GENDER STATE BEFORE (look for highlighted):', before.includes('Male') ? 'contains Male text' : 'no Male text');

  // Set Condition On = Working Days, Operator = Greater than, Value1 = 10
  await page.locator('label:has-text("Condition On")').locator('xpath=following::select[1]').selectOption({ label: 'Working Days' });
  await page.locator('label:has-text("Operator")').first().locator('xpath=following::select[1]').selectOption({ label: 'Greater than (>)' });
  await page.locator('label:has-text("Value1")').locator('xpath=following::input[1]').fill('10');

  // toggle gender to Female (from Male) to test change+persist
  await page.locator('button:has-text("Female")').first().click();

  await page.waitForTimeout(400);
  await page.screenshot({ path: SS + '02l-condition-edited.png', fullPage: true });

  await page.locator('button:has-text("Update")').first().click();
  await page.waitForTimeout(2500);
  await page.waitForLoadState('networkidle', {timeout:10000}).catch(()=>{});
  console.log('=== API LOG (save 1) ===', JSON.stringify(apiLog, null, 1));

  // reload and verify
  await openBasic50(page);
  await page.waitForTimeout(500);
  const condOnVal = await page.locator('label:has-text("Condition On")').locator('xpath=following::select[1]').inputValue();
  const opVal = await page.locator('label:has-text("Operator")').first().locator('xpath=following::select[1]').inputValue();
  const val1 = await page.locator('label:has-text("Value1")').locator('xpath=following::input[1]').inputValue();
  const femaleBtnClass = await page.locator('button:has-text("Female")').first().getAttribute('class');
  console.log('AFTER RELOAD -> conditionOn:', condOnVal, 'operator:', opVal, 'value1:', val1, 'femaleBtnClass:', femaleBtnClass);
  await page.screenshot({ path: SS + '02m-after-reload-condition.png', fullPage: true });

  // Now revert: set Condition On back to Choose, clear value1, set Gender back to Male
  await page.locator('label:has-text("Condition On")').locator('xpath=following::select[1]').selectOption({ label: 'Choose' }).catch(()=>{});
  await page.locator('label:has-text("Value1")').locator('xpath=following::input[1]').fill('');
  await page.locator('button:has-text("Male")').first().click();
  await page.waitForTimeout(400);
  await page.locator('button:has-text("Update")').first().click();
  await page.waitForTimeout(2500);
  console.log('Reverted condition fields back to original (Male, no numeric condition).');

  // final verify revert persisted
  await openBasic50(page);
  const condOnVal2 = await page.locator('label:has-text("Condition On")').locator('xpath=following::select[1]').inputValue();
  const maleBtnClass = await page.locator('button:has-text("Male")').first().getAttribute('class');
  console.log('AFTER REVERT+RELOAD -> conditionOn:', condOnVal2, 'maleBtnClass:', maleBtnClass);

} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
