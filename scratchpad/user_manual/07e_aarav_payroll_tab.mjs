import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1200 }, storageState: STATE });
const page = await context.newPage();

const apiLog = [];
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('127.0.0.1:5000/api') && (url.includes('salary') || url.includes('structure') || url.includes('slab'))) {
    let body = null; try { body = await res.json(); } catch {}
    apiLog.push({ url, status: res.status(), body });
  }
});

try {
  await page.goto('http://localhost:5173/employees/171', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("Payroll Detail")').first().click();
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle', {timeout:10000}).catch(()=>{});
  await page.screenshot({ path: SS + '07f-aarav-payroll-detail-tab.png', fullPage: true });
  const t = await page.innerText('body');
  console.log(t.slice(t.indexOf('Payroll Detail')));
  console.log('=== API ===');
  console.log(JSON.stringify(apiLog, null, 1).slice(0, 8000));
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
