import { chromium } from 'playwright';

const SS = 'D:/shakyadita_projects/apponexthrms/scratchpad/user_manual/';
const STATE = SS + 'storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1100 }, storageState: STATE });
const page = await context.newPage();

try {
  await page.goto('http://localhost:5173/payroll/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("Cycles")').first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: SS + '01a-cycles-list.png', fullPage: true });
  console.log('URL:', page.url());

  const bodyText = await page.innerText('body');
  console.log('=== CYCLES LIST TEXT ===');
  console.log(bodyText.slice(0, 3000));

  // Try to open "Add Cycle" or "New Cycle" or "+" button to see the form fields
  const addBtn = page.locator('button:has-text("Add Cycle"), button:has-text("New Cycle"), button:has-text("Create Cycle"), button:has-text("+ Add")').first();
  const addCount = await addBtn.count();
  console.log('Add button count:', addCount);
  if (addCount > 0) {
    await addBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: SS + '01b-cycle-form-new.png', fullPage: true });
    const formText = await page.innerText('body');
    console.log('=== NEW CYCLE FORM TEXT ===');
    console.log(formText.slice(0, 3000));
    // list all form field labels/inputs
    const labels = await page.$$eval('label', els => els.map(e => e.textContent.trim()));
    console.log('LABELS:', JSON.stringify(labels));
  }
} catch (e) {
  console.log('ERROR:', e.message, e.stack);
}

await browser.close();
