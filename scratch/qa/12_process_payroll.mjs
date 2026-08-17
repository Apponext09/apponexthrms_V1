import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

const apiLog = [];
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('/api/') || url.includes('/payroll')) {
    apiLog.push({ url, status: res.status(), method: res.request().method() });
  }
});

try {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // dialog handler in case of confirm()
  page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

  const btn = page.locator('button:has-text("1. Process Payroll")');
  await btn.click();
  console.log('Clicked Process Payroll, waiting...');
  await page.waitForTimeout(6000);
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(()=>{});
  await page.waitForTimeout(2000);

  await page.screenshot({ path: SS + '06a-after-process-payroll.png', fullPage: true });
  console.log('Post-process screenshot done');

  // check for toast/message text
  const bodyText = await page.innerText('body');
  const toastCandidates = bodyText.match(/(success|processed|error|failed)[^\n]{0,120}/gi);
  console.log('Toast candidates:', JSON.stringify(toastCandidates?.slice(0,10)));

  console.log('--- API LOG (last 40) ---');
  console.log(JSON.stringify(apiLog.slice(-40), null, 1));

} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
