import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

const apiLog = [];
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('process-register') || url.includes('/payroll/cycles') || (url.includes('/payroll') && !url.includes('5173'))) {
    let body = null;
    try { body = await res.json(); } catch {}
    apiLog.push({ url, status: res.status(), bodyPreview: JSON.stringify(body)?.slice(0,500) });
  }
});

try {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: SS + '06d-reload-state.png', fullPage: false });

  const bodyText = await page.innerText('body');
  const runMatch = bodyText.match(/Run #\d+[^\n]*/);
  console.log('Run status text:', runMatch);

  console.log('--- API responses ---');
  for (const l of apiLog) {
    console.log(l.url, l.status);
    console.log(l.bodyPreview);
    console.log('---');
  }
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
