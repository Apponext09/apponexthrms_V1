import { chromium } from 'playwright';

const OUT = 'D:\\shakyadita_projects\\apponexthrms\\scratchpad\\qa_round3';
const BASE = 'http://localhost:5173';
const log = (...a) => console.log(new Date().toISOString(), ...a);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  const page = await context.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', 'shakya@gmail.com');
  await page.fill('#password', 'shakya@gmail.com');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(1200);

  await page.goto(`${BASE}/payroll/settlements`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.locator('button:has-text("Pending")').first().click();
  await page.waitForTimeout(1000);

  await page.screenshot({ path: `${OUT}/39_pending_after_full_reload.png`, fullPage: true });

  const tiles = await page.evaluate(() => {
    const labels = ['Total FnF Records', 'Pending Approvals', 'Approved Settlements', 'Closed & Paid'];
    const out = {};
    for (const label of labels) {
      const p = Array.from(document.querySelectorAll('p')).find(el => el.textContent.trim() === label);
      out[label] = p ? p.parentElement.querySelector('h3')?.textContent.trim() : null;
    }
    return out;
  });
  const rows = await page.locator('table tbody tr').allTextContents();
  log('TILES after fresh reload:', JSON.stringify(tiles));
  log('Pending list row count after fresh reload:', rows.length);
  log('Pending list rows:', JSON.stringify(rows, null, 2));

  await browser.close();
})();
