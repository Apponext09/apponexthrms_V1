import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/loans', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.locator('button:has-text("Create Application")').first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: SS + '10c-loan-create-form.png', fullPage: true });
  console.log('URL:', page.url());

  const bodyText = await page.innerText('body');
  console.log('FORM TEXT:', bodyText.slice(bodyText.length - 3000));

  const selects = await page.$$('select');
  for (const s of selects) {
    const name = await s.getAttribute('name') || await s.getAttribute('id') || '(no name)';
    const opts = await s.$$eval('option', os => os.map(o => o.textContent.trim()));
    console.log('SELECT', name, ':', JSON.stringify(opts));
  }
  const inputs = await page.$$eval('input', els => els.map(e => ({name: e.name||e.id, type: e.type, placeholder: e.placeholder})));
  console.log('INPUTS:', JSON.stringify(inputs, null, 1));
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
