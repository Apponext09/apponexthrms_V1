import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1200 }, storageState: STATE });
const page = await context.newPage();
page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

const apiLog = [];
page.on('response', async (res) => {
  const url = res.url();
  const method = res.request().method();
  if (url.includes('127.0.0.1:5000') && (method==='POST'||method==='PUT') && (url.includes('slab')||url.includes('assign')||url.includes('salary-structure'))) {
    let body = null; try { body = await res.json(); } catch {}
    apiLog.push({ url, method, status: res.status(), body });
  }
});

try {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("Assign Slab")').first().click();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: SS + '06j-assign-slab-before.png', fullPage: true });

  await page.screenshot({ path: SS + '06k-assign-slab-search-172.png', fullPage: true });
  const t = await page.innerText('body');
  console.log(t.slice(t.indexOf('EMPLOYEE DETAILS')-50, t.indexOf('EMPLOYEE DETAILS')+1200));

  // fill CTC input in that row and click Assign
  const row = page.locator('tr', { hasText: 'EMP-172' }).first();
  const ctcInput = row.locator('input[type="number"]').first();
  await ctcInput.fill('350000');
  await page.waitForTimeout(300);
  await row.locator('button:has-text("Assign")').first().click();
  await page.waitForTimeout(2500);
  await page.waitForLoadState('networkidle', {timeout:10000}).catch(()=>{});
  await page.screenshot({ path: SS + '06l-assign-slab-after.png', fullPage: true });

  console.log('=== API LOG ===');
  console.log(JSON.stringify(apiLog, null, 1));

  const t2 = await page.innerText('body');
  console.log('=== POST-ASSIGN ROW STATE ===');
  const idx = t2.indexOf('EMP-172');
  console.log(t2.slice(idx-300, idx+400));

} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
