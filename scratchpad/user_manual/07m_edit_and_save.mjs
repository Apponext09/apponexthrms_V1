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
  if (url.includes('127.0.0.1:5000') && (method==='PUT'||method==='PATCH'||method==='POST') && (url.includes('salary-structure')||url.includes('structure'))) {
    let body = null; try { body = await res.json(); } catch {}
    apiLog.push({ url, method, status: res.status(), body });
  }
});
page.on('request', req => {
  if ((req.method()==='PUT'||req.method()==='PATCH'||req.method()==='POST') && (req.url().includes('structure'))) {
    console.log('REQ', req.method(), req.url());
    console.log('POSTDATA', req.postData()?.slice(0,1500));
  }
});

try {
  await page.goto('http://localhost:5173/employees/179', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Payroll Detail")').first().click();
  await page.waitForTimeout(1500);
  await page.locator('table tbody tr').first().locator('button[title="Edit Pay Structure"]').click();
  await page.waitForTimeout(1500);

  // change the Monthly Gross/CTC Input to 45000 (distinctive test value)
  const ctcInput = page.locator('text=Monthly Gross / CTC Input').locator('xpath=following::input[1]');
  await ctcInput.fill('45000');
  await page.waitForTimeout(500);
  await page.screenshot({ path: SS + '07n-arjun-edit-changed-value.png', fullPage: true });

  await page.locator('button:has-text("Update Structure")').click();
  await page.waitForTimeout(2500);
  await page.waitForLoadState('networkidle', {timeout:10000}).catch(()=>{});
  await page.screenshot({ path: SS + '07o-arjun-after-update.png', fullPage: true });

  console.log('=== API LOG ===');
  console.log(JSON.stringify(apiLog, null, 1));
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
