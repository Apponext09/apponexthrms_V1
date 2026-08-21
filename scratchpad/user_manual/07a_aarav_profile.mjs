import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1200 }, storageState: STATE });
const page = await context.newPage();

const apiLog = [];
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('127.0.0.1:5000') && (url.includes('salary') || url.includes('structure') || url.includes('payroll'))) {
    let body = null; try { body = await res.json(); } catch {}
    apiLog.push({ url, status: res.status(), body });
  }
});

try {
  await page.goto('http://localhost:5173/employees', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.locator('text=Aarav Mehta').first().click();
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle', {timeout:15000}).catch(()=>{});
  console.log('Profile URL:', page.url());

  const tabTexts = await page.$$eval('button, [role=tab]', els => els.map(e=>e.textContent.trim()).filter(Boolean));
  console.log('TABS:', JSON.stringify([...new Set(tabTexts)].filter(t=>t.length<40)));

  const payrollTab = page.locator('button:has-text("Payroll Detail"), button:has-text("Payroll")').first();
  if (await payrollTab.count() > 0) {
    await payrollTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: SS + '07b-aarav-payroll-detail.png', fullPage: true });
    const t = await page.innerText('body');
    console.log('=== PAYROLL DETAIL TAB ===');
    console.log(t.slice(t.indexOf('Payroll Detail')));
  }
  console.log('=== API LOG ===');
  console.log(JSON.stringify(apiLog.map(l=>({url:l.url,status:l.status})), null, 1));
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
