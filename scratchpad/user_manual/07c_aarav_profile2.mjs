import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/employees/171', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: SS + '07d-aarav-profile-landing.png', fullPage: true });

  const bodyText = await page.innerText('body');
  console.log(bodyText.slice(bodyText.indexOf('Aarav'), bodyText.indexOf('Aarav')+2000));
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
