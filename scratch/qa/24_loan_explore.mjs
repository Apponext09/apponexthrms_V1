import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("Loan Type Settings")').first().click();
  await page.waitForTimeout(2000);
  console.log('Loan Type Settings URL:', page.url());
  await page.screenshot({ path: SS + '10a-loan-type-settings.png', fullPage: true });

  await page.locator('button:has-text("Loan Requests & Disbursal")').first().click();
  await page.waitForTimeout(2500);
  console.log('Loan Requests URL:', page.url());
  await page.screenshot({ path: SS + '10b-loan-requests-landing.png', fullPage: true });

  const bodyText = await page.innerText('body');
  console.log('LOAN REQUESTS PAGE TEXT:', bodyText.slice(bodyText.indexOf('Loan'), bodyText.indexOf('Loan')+3000));
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
