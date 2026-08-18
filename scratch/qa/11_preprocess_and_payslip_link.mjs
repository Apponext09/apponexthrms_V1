import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  // Scroll the register table horizontally to show earnings columns for Aarav row
  const tableContainer = await page.$('table');
  // find scrollable ancestor
  await page.evaluate(() => {
    const tbl = document.querySelector('table');
    let el = tbl;
    while (el) {
      if (el.scrollWidth > el.clientWidth) { el.scrollLeft = el.scrollWidth; break; }
      el = el.parentElement;
    }
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: SS + '05d-register-scrolled-right.png', fullPage: false });
  console.log('scrolled screenshot done');

  // reset scroll
  await page.evaluate(() => {
    const tbl = document.querySelector('table');
    let el = tbl;
    while (el) {
      if (el.scrollWidth > el.clientWidth) { el.scrollLeft = 0; break; }
      el = el.parentElement;
    }
  });

  // Click "Standard Pay Slab" link for Aarav row to see what it shows
  const rows = await page.$$('table tbody tr');
  let aaravRow = null;
  for (const r of rows) {
    const t = await r.innerText();
    if (t.includes('Aarav')) { aaravRow = r; break; }
  }
  if (aaravRow) {
    const link = await aaravRow.$('text=Standard Pay Slab');
    if (link) {
      await link.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: SS + '05e-pay-slab-link-click.png', fullPage: true });
      console.log('Pay slab link click captured, url:', page.url());
    } else {
      console.log('No pay slab link found in Aarav row');
    }
  } else {
    console.log('Aarav row not found');
  }
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
