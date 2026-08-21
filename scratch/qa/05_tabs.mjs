import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // Cycles tab
  await page.click('text=Cycles');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: SS + '02-cycles-tab.png', fullPage: true });
  console.log('Cycles tab captured');

  // Components catalog tab (already have, but capture deduction sub tab too)
  await page.click('text=Components Catalog');
  await page.waitForTimeout(1500);
  await page.click('text=Deduction');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SS + '03b-components-deduction.png', fullPage: true });
  console.log('Components Deduction tab captured');

  await page.click('text=Earning');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: SS + '03a-components-earning.png', fullPage: true });

  // Slabs tab
  await page.click('text=Slabs & Statutory Rules');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: SS + '04-slabs-tab.png', fullPage: true });
  console.log('Slabs tab captured');

  const bodyText = await page.innerText('body');
  console.log('SLABS PAGE TEXT SNIPPET:', bodyText.slice(0, 2000));

} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
