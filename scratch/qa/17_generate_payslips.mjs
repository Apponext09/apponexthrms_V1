import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

const apiLog = [];
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('127.0.0.1:5000') && url.includes('payslip')) {
    let body = null;
    try { body = await res.json(); } catch {}
    apiLog.push({ url, status: res.status(), body });
  }
});
page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

async function generateFor(employeeLabel, tag) {
  await page.goto('http://localhost:5173/payroll/payslip-requests', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  {
    const selects = await page.$$('select');
    let done = false;
    for (const s of selects) {
      const opts = await s.$$eval('option', os => os.map(o => ({ value: o.value, text: o.textContent })));
      const match = opts.find(o => o.text.includes(employeeLabel));
      if (match) {
        await s.selectOption(match.value);
        done = true;
        break;
      }
    }
    if (!done) throw new Error('Could not find select for ' + employeeLabel);
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: SS + `07b-${tag}-before-generate.png`, fullPage: true });

  await page.locator('button:has-text("Generate Payslip")').first().click();
  await page.waitForTimeout(4000);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(()=>{});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SS + `07c-${tag}-after-generate.png`, fullPage: true });
  console.log(`Generated payslip screenshot for ${tag}`);

  const bodyText = await page.innerText('body');
  console.log(`--- ${tag} body snippet ---`);
  console.log(bodyText.slice(bodyText.indexOf('Monthly Salary Statements'), bodyText.indexOf('Monthly Salary Statements')+2500));
}

try {
  await generateFor('Aarav Mehta', '171-aarav-paidleave');
  await generateFor('Ishita Bose', '176-ishita-unpaidleave');
  await generateFor('Arjun Menon', '179-arjun-baseline');

  console.log('--- API LOG ---');
  console.log(JSON.stringify(apiLog.map(l => ({url:l.url, status:l.status})), null, 1));
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
