import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1100 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Components Catalog")').first().click();
  await page.waitForTimeout(1200);
  await page.locator('text=Basic').first().click();
  await page.waitForTimeout(800);
  const row = page.locator('tr', { hasText: 'Basic 50%' });
  await row.locator('button, a').first().click();
  await page.waitForTimeout(1200);

  // dump all inputs/selects with nearby label
  const fields = await page.$$eval('input, select', els => els.map(e => {
    let label = '';
    // find preceding label sibling in parent
    let p = e.closest('div');
    if (p) {
      const lab = p.querySelector('label');
      if (lab) label = lab.textContent.trim();
    }
    return { tag: e.tagName, type: e.type, name: e.name, id: e.id, value: e.value, label };
  }));
  console.log(JSON.stringify(fields, null, 1));
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
