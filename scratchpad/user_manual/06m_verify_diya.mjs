import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1200 }, storageState: STATE });
const page = await context.newPage();

const apiLog = [];
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('salary-structure?employee_id=172')) {
    let body = null; try { body = await res.json(); } catch {}
    apiLog.push({ url, status: res.status(), body });
  }
});

try {
  await page.goto('http://localhost:5173/employees/172', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Payroll Detail")').first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: SS + '06n-diya-payroll-detail-after-assign.png', fullPage: true });
  const t = await page.innerText('body');
  console.log(t.slice(t.indexOf('Payroll Detail')));
  console.log('=== API ===');
  console.log(JSON.stringify(apiLog, null, 1));

  // reload fresh and re-check assign-slab tab indicator too
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Assign Slab")').first().click();
  await page.waitForTimeout(1800);
  const t2 = await page.innerText('body');
  const idx = t2.indexOf('EMP-172');
  console.log('=== ASSIGN SLAB TAB (fresh reload) FOR EMP-172 ===');
  console.log(t2.slice(idx-100, idx+300));
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
