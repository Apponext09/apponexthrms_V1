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
  if (url.includes('cycle') || url.includes('master-payroll') || url.includes('payroll-cycle') || (url.includes('payroll') && (res.request().method()==='PUT' || res.request().method()==='POST' || res.request().method()==='PATCH'))) {
    let body = null;
    try { body = await res.json(); } catch {}
    apiLog.push({ url, method: res.request().method(), status: res.status(), body });
  }
});
page.on('request', req => {
  if ((req.method()==='PUT' || req.method()==='PATCH') && req.url().includes('payroll')) {
    console.log('REQUEST', req.method(), req.url());
    console.log('POSTDATA', req.postData());
  }
});

try {
  await page.goto('http://localhost:5173/payroll/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("Cycles")').first().click();
  await page.waitForTimeout(1200);
  await page.locator('text=QA_ROUND3_TEST_CYCLE').first().click();
  await page.waitForTimeout(1200);

  // Also select "Total no of days" dropdown to 30 this time, and set Cap
  const daysSelect = page.locator('label:has-text("Total no. of days for Payroll calculation")').locator('xpath=following::select[1]');
  await daysSelect.selectOption({ label: '30' }).catch(async e => {
    console.log('select by label 30 failed, trying value 30', e.message);
    await daysSelect.selectOption('30').catch(()=>{});
  });

  const capFieldLoc = page.locator('label:has-text("Payroll Calculation Cap")').locator('xpath=following::input[1]');
  await capFieldLoc.fill('777777');
  await page.waitForTimeout(300);

  await page.locator('button:has-text("Update")').first().click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', {timeout:10000}).catch(()=>{});

  console.log('=== API LOG ===');
  console.log(JSON.stringify(apiLog, null, 1));

  // reload and check
  await page.goto('http://localhost:5173/payroll/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Cycles")').first().click();
  await page.waitForTimeout(1000);
  await page.locator('text=QA_ROUND3_TEST_CYCLE').first().click();
  await page.waitForTimeout(1200);
  const capAfterReload = await page.locator('label:has-text("Payroll Calculation Cap")').locator('xpath=following::input[1]').inputValue();
  const daysAfterReload = await page.locator('label:has-text("Total no. of days for Payroll calculation")').locator('xpath=following::select[1]').inputValue();
  console.log('CAP AFTER RELOAD:', capAfterReload);
  console.log('DAYS SELECT AFTER RELOAD:', daysAfterReload);
  await page.screenshot({ path: SS + '01i-after-reload-v2.png', fullPage: true });

} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
