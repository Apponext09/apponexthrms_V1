import { chromium } from 'playwright';

const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  const headers = await page.$$eval('table thead th', ths => ths.map(th => th.innerText.trim()));

  const rows = await page.$$eval('table tbody tr', trs => trs.map(tr => {
    const tds = Array.from(tr.querySelectorAll('td'));
    return tds.map(td => {
      const input = td.querySelector('input, textarea, select');
      if (input) return '[INPUT:' + (input.value ?? '') + ']';
      return td.innerText.trim();
    });
  }));

  // Print header-aligned for target employees
  const targets = ['Aarav','Diya','Vivaan','Anaya','Kabir','Ishita','Reyansh','Myra','Arjun','Saanvi'];
  for (const row of rows) {
    const firstName = row[2];
    if (targets.includes(firstName)) {
      console.log('=== ' + firstName + ' ===');
      // headers[0]=ACTION, headers[1]=PAYMENT STATUS -> row[0],row[1]; then align rest
      for (let i = 2; i < headers.length; i++) {
        console.log(`  ${headers[i]}: ${row[i]}`);
      }
    }
  }
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
