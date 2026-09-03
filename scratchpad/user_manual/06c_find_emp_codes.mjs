import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/employees', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  const searchBox = await page.$('input[placeholder*="Search" i]');
  if (searchBox) {
    await searchBox.fill('EMP01');
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: SS + '06c-search-emp01.png', fullPage: true });
  const t = await page.innerText('body');
  console.log(t.slice(t.indexOf('EMP0')-200, t.indexOf('EMP0')+3000));
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
