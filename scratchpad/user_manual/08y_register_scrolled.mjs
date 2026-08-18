import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  const selects = await page.$$('select');
  await selects[0].selectOption({ label: 'Attendance' });
  await selects[1].selectOption({ label: 'QA_ROUND3_TEST_CYCLE' });
  await selects[10].selectOption({ label: 'Arjun Menon (EMP020)' });
  await page.waitForTimeout(500);
  await page.locator('button:has-text("Filter")').first().click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', {timeout:15000}).catch(()=>{});

  // scroll the table container horizontally to reveal Basic/HRA/PF/PT/Net columns
  const scrollContainer = await page.$('table');
  const box = await scrollContainer.boundingBox();
  // find scrollable ancestor
  await page.evaluate(() => {
    const table = document.querySelector('table');
    let el = table;
    while (el) {
      if (el.scrollWidth > el.clientWidth) { el.scrollLeft = el.scrollWidth; break; }
      el = el.parentElement;
    }
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: SS + '08z-register-scrolled-right.png', fullPage: false });

  // also try scrolling to middle to capture Basic/HRA/PF/PT columns
  await page.evaluate(() => {
    const table = document.querySelector('table');
    let el = table;
    while (el) {
      if (el.scrollWidth > el.clientWidth) { el.scrollLeft = el.scrollWidth * 0.45; break; }
      el = el.parentElement;
    }
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: SS + '08z2-register-scrolled-mid.png', fullPage: false });
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
