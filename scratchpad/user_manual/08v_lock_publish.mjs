import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();
page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

function rowExtract(page) {
  return page.$$eval('table tbody tr', trs => trs.map(tr => Array.from(tr.querySelectorAll('td')).map(td => {
    const input = td.querySelector('input');
    if (input) return 'INPUT:' + input.value;
    return td.innerText.trim();
  })));
}

try {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  const selects = await page.$$('select');
  await selects[0].selectOption({ label: 'Attendance' });
  await selects[1].selectOption({ label: 'QA_ROUND3_TEST_CYCLE' });
  await selects[10].selectOption({ label: 'Arjun Menon (EMP020)' });
  await page.waitForTimeout(500);
  await page.locator('button:has-text("Filter")').first().click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', {timeout:15000}).catch(()=>{});

  // Lock Figures
  const lockBtn = page.locator('button:has-text("2. Lock Figures"), button:has-text("Lock Figures")').first();
  await lockBtn.click();
  await page.waitForTimeout(4000);
  await page.waitForLoadState('networkidle', {timeout:15000}).catch(()=>{});
  await page.screenshot({ path: SS + '08w-AFTER-lock.png', fullPage: true });
  const bt1 = await page.innerText('body');
  console.log('Lock toast:', bt1.match(/(lock|error|fail)[^\n]{0,100}/gi)?.slice(0,5));

  // Publish Payslips
  const pubBtn = page.locator('button:has-text("3. Publish Payslips"), button:has-text("Publish Payslips")').first();
  await pubBtn.click();
  await page.waitForTimeout(4000);
  await page.waitForLoadState('networkidle', {timeout:15000}).catch(()=>{});
  await page.screenshot({ path: SS + '08x-AFTER-publish.png', fullPage: true });
  const bt2 = await page.innerText('body');
  console.log('Publish toast:', bt2.match(/(publish|error|fail)[^\n]{0,100}/gi)?.slice(0,5));

  console.log('FINAL ROW:', JSON.stringify(await rowExtract(page)));
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
