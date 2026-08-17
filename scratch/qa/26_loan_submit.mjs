import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

const apiLog = [];
page.on('response', async (res) => {
  if (res.url().includes('127.0.0.1:5000') && res.url().includes('loan')) {
    let body = null;
    try { body = await res.json(); } catch {}
    apiLog.push({ url: res.url(), method: res.request().method(), status: res.status(), body });
  }
});

try {
  await page.goto('http://localhost:5173/payroll/loans', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.locator('button:has-text("Disburse Loan")').first().click();
  await page.waitForTimeout(1500);

  const selects = await page.$$('select');
  // employee select = first select with our target
  const empSelect = selects[0];
  const empOpts = await empSelect.$$eval('option', os => os.map(o => ({ value: o.value, text: o.textContent })));
  const empMatch = empOpts.find(o => o.text.includes('Saanvi Ghosh'));
  await empSelect.selectOption(empMatch.value);

  const loanTypeSelect = selects[1];
  const ltOpts = await loanTypeSelect.$$eval('option', os => os.map(o => ({ value: o.value, text: o.textContent })));
  const ltMatch = ltOpts.find(o => o.text.includes('Personal loan'));
  await loanTypeSelect.selectOption(ltMatch.value);
  await page.waitForTimeout(500);

  const numberInputs = await page.$$('input[type=number]');
  // order: amount, tenure, interest rate
  await numberInputs[0].fill('60000');
  await numberInputs[1].fill('12');
  await numberInputs[2].fill('10');

  const textInputs = await page.$$('input[placeholder*="Home renovation"]');
  if (textInputs[0]) await textInputs[0].fill('QA automated test loan');

  await page.screenshot({ path: SS + '10d-loan-form-filled.png', fullPage: true });
  console.log('Form filled screenshot done');

  await page.locator('button:has-text("Grant & Disburse Loan")').first().click();
  await page.waitForTimeout(4000);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(()=>{});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SS + '10e-loan-after-submit.png', fullPage: true });
  console.log('After submit screenshot done');

  console.log('--- API LOG ---');
  console.log(JSON.stringify(apiLog, null, 1)?.slice(0, 3000));
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
