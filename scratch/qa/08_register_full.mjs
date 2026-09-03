import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  // scroll down to register and screenshot full page
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: SS + '05b-process-filters-top.png', fullPage: false });

  // Get all register rows text (first name, designation, pay slab, code)
  await page.waitForSelector('text=Payroll Register', { timeout: 15000 }).catch(()=>{});
  await page.waitForTimeout(1000);

  const rows = await page.$$eval('table tbody tr', trs => trs.map(tr => {
    const tds = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
    return tds;
  }));
  console.log('ROW COUNT:', rows.length);
  console.log(JSON.stringify(rows, null, 1));

  // scroll register into view fully & screenshot full page (long)
  await page.screenshot({ path: SS + '05c-register-full.png', fullPage: true });

} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
