import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

const apiLog = [];
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('127.0.0.1:5000') && (url.includes('run') )) {
    let body = null; try { body = await res.json(); } catch {}
    apiLog.push({ url, method: res.request().method(), status: res.status(), body });
  }
});

try {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("Payroll Runs")').first().click();
  await page.waitForTimeout(2000);

  await page.locator('text=View Details').first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: SS + '09k-run30-details.png', fullPage: true });
  const t = await page.innerText('body');
  const idx = t.indexOf('Arjun');
  console.log('ARJUN CONTEXT:', idx>-1 ? t.slice(idx-300, idx+300) : 'not found in details view');
  console.log('=== API LOG ===');
  console.log(JSON.stringify(apiLog, null, 1).slice(0, 4000));
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
