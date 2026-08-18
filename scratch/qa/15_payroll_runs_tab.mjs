import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

const apiLog = [];
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('127.0.0.1:5000') && (url.includes('payroll'))) {
    let body = null;
    try { body = await res.json(); } catch {}
    apiLog.push({ url, status: res.status(), body });
  }
});

try {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.locator('button:has-text("Payroll Runs")').first().click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: SS + '06e-payroll-runs-tab.png', fullPage: true });
  console.log('Payroll Runs tab captured');

  // Try clicking on the run row/View to get error detail
  const bodyText = await page.innerText('body');
  console.log('RUNS TAB TEXT:', bodyText.slice(bodyText.indexOf('Payroll Runs'), bodyText.indexOf('Payroll Runs')+2000));

  // dump relevant API bodies about run 27
  for (const l of apiLog) {
    if (JSON.stringify(l.body)?.includes('27') || l.url.includes('/27')) {
      console.log('API:', l.url, l.status);
      console.log(JSON.stringify(l.body)?.slice(0, 1500));
      console.log('---');
    }
  }
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
