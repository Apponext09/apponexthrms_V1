import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1200 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Components Catalog")').first().click();
  await page.waitForTimeout(1200);

  // Value type component: click "Basic" (the plain VALUE one) edit pencil
  await page.locator('text=Basic').first().click();
  await page.waitForTimeout(800);
  const valRow = page.locator('tr', { hasText: /^Basic$/ }).filter({ hasText: 'VALUE' });
  const count = await valRow.count();
  console.log('VALUE row count:', count);
  if (count > 0) {
    await valRow.first().locator('button, a').first().click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: SS + '03a-value-type-component.png', fullPage: true });
  }

  // Now open the Group edit panel: click the pencil icon next to "Basic" group header
  await page.goto('http://localhost:5173/payroll/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Components Catalog")').first().click();
  await page.waitForTimeout(1200);
  const groupHeader = page.locator('div', { hasText: /^Basic$/ }).first();
  // click pencil icon within the Basic group header row
  await page.locator('text=Basic').first().locator('xpath=ancestor::div[contains(@class,"cursor-pointer") or contains(@class,"rounded")][1]').first().locator('button').first().click().catch(async () => {
    console.log('fallback: click pencil near Basic header');
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: SS + '03b-group-edit-attempt.png', fullPage: true });
  const t = await page.innerText('body');
  console.log(t.slice(t.indexOf('Group'), t.indexOf('Group')+2000));

} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
