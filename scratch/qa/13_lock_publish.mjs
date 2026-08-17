import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

try {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  // Lock Figures
  const lockBtn = page.locator('button:has-text("2. Lock Figures"), button:has-text("Lock Figures")').first();
  const isDisabled = await lockBtn.isDisabled().catch(()=>null);
  console.log('Lock button disabled?', isDisabled);
  await lockBtn.click();
  await page.waitForTimeout(4000);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(()=>{});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SS + '06b-after-lock-figures.png', fullPage: true });
  console.log('Lock figures screenshot done, url:', page.url());

  const bodyText1 = await page.innerText('body');
  console.log('Body snippet after lock:', bodyText1.match(/(lock|error|fail)[^\n]{0,100}/gi)?.slice(0,10));

  // Publish Payslips
  const pubBtn = page.locator('button:has-text("3. Publish Payslips"), button:has-text("Publish Payslips")').first();
  const isDisabled2 = await pubBtn.isDisabled().catch(()=>null);
  console.log('Publish button disabled?', isDisabled2);
  await pubBtn.click();
  await page.waitForTimeout(4000);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(()=>{});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SS + '06c-after-publish-payslips.png', fullPage: true });
  console.log('Publish screenshot done');

  const bodyText2 = await page.innerText('body');
  console.log('Body snippet after publish:', bodyText2.match(/(publish|error|fail)[^\n]{0,100}/gi)?.slice(0,10));

} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
