import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();
page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

const apiLog = [];
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('127.0.0.1:5000') && url.includes('payroll') && (url.includes('process')||url.includes('register')||url.includes('run'))) {
    apiLog.push({ url, method: res.request().method(), status: res.status() });
  }
});

try {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  const selects = await page.$$('select');
  await selects[0].selectOption({ label: 'Attendance' });
  await selects[1].selectOption({ label: 'Monthly cycle' });
  await selects[10].selectOption({ label: 'Arjun Menon (EMP020)' });
  await page.waitForTimeout(500);

  // check Bypass Cache checkbox
  const bypassCb = page.locator('text=Bypass Cache').locator('xpath=preceding::input[@type="checkbox"][1]');
  await bypassCb.check().catch(async()=>{
    // fallback: click label text itself
    await page.locator('text=Bypass Cache').click();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: SS + '08i-before-filter-bypass.png', fullPage: true });

  await page.locator('button:has-text("Filter")').first().click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', {timeout:15000}).catch(()=>{});
  await page.screenshot({ path: SS + '08j-register-after-bypass-filter.png', fullPage: true });

  const rowData = await page.$$eval('table tbody tr', trs => trs.map(tr => Array.from(tr.querySelectorAll('td')).map(td => {
    const input = td.querySelector('input');
    if (input) return 'INPUT:' + input.value;
    return td.innerText.trim();
  })));
  console.log('ROW AFTER BYPASS FILTER:', JSON.stringify(rowData[0]));

  // Now click "1. Process Payroll" style button if present
  const processBtn = page.locator('button:has-text("Process")').first();
  console.log('Process button count:', await processBtn.count());
  if (await processBtn.count() > 0) {
    await processBtn.click();
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle', {timeout:15000}).catch(()=>{});
    await page.screenshot({ path: SS + '08k-after-process-click.png', fullPage: true });
    const rowData2 = await page.$$eval('table tbody tr', trs => trs.map(tr => Array.from(tr.querySelectorAll('td')).map(td => {
      const input = td.querySelector('input');
      if (input) return 'INPUT:' + input.value;
      return td.innerText.trim();
    })));
    console.log('ROW AFTER PROCESS CLICK:', JSON.stringify(rowData2[0]));
  }

  console.log('API LOG:', JSON.stringify(apiLog, null, 1));
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
