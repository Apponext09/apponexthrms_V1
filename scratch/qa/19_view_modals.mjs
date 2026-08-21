import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

async function viewFor(name, tag) {
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2200);
  const rows = await page.$$('table tbody tr');
  let target = null;
  for (const r of rows) {
    const t = await r.innerText();
    if (t.includes(name)) { target = r; break; }
  }
  if (!target) { console.log('Row not found for', name); return; }
  const viewBtn = await target.$('button:has-text("View")');
  await viewBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: SS + `07e-view-${tag}.png`, fullPage: false });
  const modalText = await page.innerText('div[class*="fixed"], .modal, [role=dialog]').catch(()=>null);
  console.log(`=== ${name} modal text ===`);
  console.log(modalText || '(could not extract modal text via selector, check screenshot)');
}

try {
  await viewFor('Ishita', '176-ishita');
  await viewFor('Arjun', '179-arjun');
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
