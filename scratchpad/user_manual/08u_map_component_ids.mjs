import { chromium } from 'playwright';

const STATE = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/storageState.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1200 }, storageState: STATE });
const page = await context.newPage();

let componentsBody = null;
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('127.0.0.1:5000') && url.includes('component-definitions') && res.request().method()==='GET') {
    try { const b = await res.json(); if (b?.data?.length > componentsBody?.data?.length || !componentsBody) componentsBody = b; } catch {}
  }
});

try {
  await page.goto('http://localhost:5173/payroll/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("Components Catalog")').first().click();
  await page.waitForTimeout(2500);

  if (componentsBody && componentsBody.data) {
    const map = componentsBody.data.filter(c => [2,3,4,5,6,7].includes(Number(c.id))).map(c => ({id:c.id, name:c.name, type:c.component_type, active:c.is_active, formula:c.formula, group:c.group_id}));
    console.log('COMPONENTS 2-7:', JSON.stringify(map, null, 1));
    console.log('TOTAL COMPONENTS FETCHED:', componentsBody.data.length);
  } else {
    console.log('No components body captured');
  }
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
