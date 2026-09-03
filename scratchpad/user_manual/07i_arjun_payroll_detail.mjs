import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/employees/179', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Payroll Detail")').first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: SS + '07j-arjun-payroll-detail.png', fullPage: true });

  // check for an edit/action icon in the structure row
  const actionCell = page.locator('table tbody tr').first();
  const html = await actionCell.innerHTML();
  console.log('ROW HTML:', html.slice(0, 2000));

  const buttons = await page.locator('table tbody tr').first().locator('button, a').count();
  console.log('Buttons/links in row:', buttons);
  for (let i=0;i<buttons;i++){
    const el = page.locator('table tbody tr').first().locator('button, a').nth(i);
    console.log(i, await el.getAttribute('title'), await el.innerText().catch(()=> ''));
  }
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
