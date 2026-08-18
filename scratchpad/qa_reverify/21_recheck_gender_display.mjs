import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SS = __dirname;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, storageState: `${SS}/authState.json` });
const page = await context.newPage();

let componentDefsResponse = null;
page.on('response', async res => {
  if (res.url().includes('component-definitions') && res.request().method() === 'GET') {
    try {
      const json = await res.json();
      const list = json.data?.components || json.data || [];
      const arr = Array.isArray(list) ? list : [];
      const hra = arr.find(c => c.id === 3);
      if (hra) {
        componentDefsResponse = hra;
        console.log('CAPTURED HRA (id=3) FROM NETWORK RESPONSE:', JSON.stringify({ genderFilter: hra.genderFilter, name: hra.name, updatedAt: hra.updatedAt }));
      }
    } catch (e) {}
  }
});

// Hard reload, bypass cache
await page.goto('http://localhost:5173/payroll/master-settings', { waitUntil: 'networkidle', timeout: 30000 });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

await page.locator('text=HRA').first().click();
await page.waitForTimeout(1500);
const hraRow = page.locator('table').last().locator('tbody tr', { hasText: 'HRA' }).first();
await hraRow.locator('button').first().click();
await page.waitForTimeout(1500);

await page.locator('text=Condition Setting').scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await page.screenshot({ path: `${SS}/21a_recheck_gender.png`, fullPage: false });

const genderButtons = page.locator('button:has-text("All"), button:has-text("Male"), button:has-text("Female")');
const count = await genderButtons.count();
for (let i = 0; i < count; i++) {
  const btn = genderButtons.nth(i);
  const text = await btn.textContent();
  const cls = await btn.getAttribute('class');
  const isActive = cls?.includes('indigo') || cls?.includes('bg-indigo') || cls?.includes('bg-blue') || cls?.includes('bg-purple');
  console.log(`Button "${text?.trim()}" active-looking=${isActive}`);
}

console.log('Network-captured HRA data:', JSON.stringify(componentDefsResponse));

await browser.close();
