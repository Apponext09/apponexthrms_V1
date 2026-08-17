import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1900, height: 1200 }, storageState: STATE });
const page = await context.newPage();

page.on('response', async (res) => {
  if (res.url().includes('generate-from-process')) {
    let text = null;
    try { text = await res.text(); } catch {}
    console.log('404 BODY:', text?.slice(0, 500));
  }
});

try {
  await page.goto('http://localhost:5173/payroll/payslip-requests', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  const selects = await page.$$('select');
  for (const s of selects) {
    const opts = await s.$$eval('option', os => os.map(o => ({ value: o.value, text: o.textContent })));
    const match = opts.find(o => o.text.includes('Aarav Mehta'));
    if (match) { await s.selectOption(match.value); break; }
  }
  await page.waitForTimeout(500);
  await page.locator('button:has-text("Generate Payslip")').first().click();
  await page.waitForTimeout(3000);

  // Now go to Payroll Processing register and click View for Aarav
  await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);
  const rows = await page.$$('table tbody tr');
  let aaravRow = null;
  for (const r of rows) {
    const t = await r.innerText();
    if (t.includes('Aarav')) { aaravRow = r; break; }
  }
  if (aaravRow) {
    const viewBtn = await aaravRow.$('button:has-text("View")');
    if (viewBtn) {
      await viewBtn.click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: SS + '07d-register-view-aarav.png', fullPage: true });
      console.log('View modal screenshot captured');
      const bt = await page.innerText('body');
      console.log('VIEW MODAL TEXT SNIPPET:', bt.slice(0, 3000));
    } else {
      console.log('No View button found in row');
    }
  } else {
    console.log('Aarav row not found');
  }
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
