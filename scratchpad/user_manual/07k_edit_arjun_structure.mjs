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
  if (url.includes('127.0.0.1:5000') && (method==='PUT'||method==='PATCH'||method==='POST') && url.includes('salary-structure')) {
    let body = null; try { body = await res.json(); } catch {}
    apiLog.push({ url, method, status: res.status(), body });
  }
});
page.on('request', req => {
  if ((req.method()==='PUT'||req.method()==='PATCH') && req.url().includes('salary-structure')) {
    console.log('REQ', req.method(), req.url());
    console.log('POSTDATA', req.postData()?.slice(0,1000));
  }
});

try {
  await page.goto('http://localhost:5173/employees/179', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Payroll Detail")').first().click();
  await page.waitForTimeout(1500);

  await page.locator('table tbody tr').first().locator('button[title="Edit Pay Structure"]').click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SS + '07l-arjun-edit-structure-form.png', fullPage: true });
  const t = await page.innerText('body');
  console.log('=== EDIT FORM TEXT ===');
  console.log(t.slice(t.indexOf('Edit'), t.indexOf('Edit')+2500));
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
