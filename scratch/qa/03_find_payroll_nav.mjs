import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // Click Payroll Management quick link
  await page.click('text=Payroll Management');
  await page.waitForTimeout(2500);
  await page.waitForLoadState('networkidle').catch(()=>{});
  console.log('URL after Payroll Management click:', page.url());
  await page.screenshot({ path: SS + '03-payroll-landing.png', fullPage: true });

  // Now check sidebar for payroll submenu texts
  const sidebarTexts = await page.$$eval('aside, nav, [class*=sidebar]', els => els.map(e => e.innerText).join('\n---\n'));
  console.log('SIDEBAR TEXT:');
  console.log(sidebarTexts.slice(0, 3000));

} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
