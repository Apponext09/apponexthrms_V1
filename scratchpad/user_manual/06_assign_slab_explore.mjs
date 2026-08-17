import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  const tabTexts = await page.$$eval('button, [role=tab]', els => els.map(e=>e.textContent.trim()).filter(Boolean));
  console.log('TABS:', JSON.stringify([...new Set(tabTexts)]));
  await page.screenshot({ path: SS + '06a-processing-landing.png', fullPage: true });

  const assignTab = page.locator('button:has-text("Assign Slab")').first();
  if (await assignTab.count() > 0) {
    await assignTab.click();
    await page.waitForTimeout(1800);
    await page.screenshot({ path: SS + '06b-assign-slab-tab.png', fullPage: true });
    const t = await page.innerText('body');
    console.log('=== ASSIGN SLAB TAB TEXT ===');
    console.log(t.slice(t.indexOf('Assign'), t.indexOf('Assign')+3000));
  }
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
