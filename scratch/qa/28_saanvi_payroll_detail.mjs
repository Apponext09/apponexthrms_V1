import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/employees/180', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.locator('button:has-text("Payroll Detail")').first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: SS + '11b-saanvi-payroll-detail-tab.png', fullPage: true });
  console.log('URL:', page.url());
  const bodyText = await page.innerText('body');
  console.log('TEXT:', bodyText.slice(bodyText.indexOf('Payroll Detail')));
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
