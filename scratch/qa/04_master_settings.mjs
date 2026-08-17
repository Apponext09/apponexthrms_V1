import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.click.bind(page); // noop
  await page.goto('http://localhost:5173/payroll', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.click('text=Payroll Master Settings');
  await page.waitForTimeout(2500);
  await page.waitForLoadState('networkidle').catch(()=>{});
  console.log('URL:', page.url());
  await page.screenshot({ path: SS + '04-master-settings-landing.png', fullPage: true });

  // look for tabs
  const tabTexts = await page.$$eval('[role=tab], button', els => els.map(e=>e.textContent.trim()).filter(Boolean));
  console.log('TABS/BUTTONS:', JSON.stringify([...new Set(tabTexts)]));
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
