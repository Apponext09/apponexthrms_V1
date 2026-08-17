import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'D:\\shakyadita_projects\\apponexthrms\\scratchpad\\qa_round3';
const BASE = 'http://localhost:5173';
const log = (...a) => console.log(new Date().toISOString(), ...a);
const results = {};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1700, height: 1100 } });
  const page = await context.newPage();
  page.on('console', msg => { if (msg.type() === 'error') log('PAGE ERROR:', msg.text()); });

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', 'shakya@gmail.com');
  await page.fill('#password', 'shakya@gmail.com');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(1200);

  await page.goto(`${BASE}/payroll/processing`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  async function getToastText() {
    await page.waitForTimeout(700);
    const toasts = page.locator('[data-sonner-toast]');
    const count = await toasts.count();
    if (count === 0) return null;
    return toasts.last().innerText();
  }

  // The tab button is plain "Process Payroll" (no numeral); the actual
  // submit action button is prefixed "1." (e.g. "1. Process Payroll" or
  // "1. Processed ✓") - must disambiguate or we click the tab instead.
  const processBtn = page.locator('button', { hasText: /^1\./ }).first();
  const processBtnText = await processBtn.innerText().catch(() => null);
  log('Process Payroll ACTION button text found:', processBtnText);

  // 7a: Generate Payroll On = "- Select -" -> click Process Payroll
  const generateSelect = page.locator('select').filter({ has: page.locator('option[value="- Select -"]') }).first();
  await generateSelect.selectOption('- Select -');
  await page.waitForTimeout(300);
  await processBtn.click();
  let t = await getToastText();
  log('7a) Process Payroll with Generate On = "- Select -" -> toast:', JSON.stringify(t));
  results.item7a_process_missing_generateOn_toast = t;
  await page.screenshot({ path: `${OUT}/26_process_missing_generateOn.png` });
  await page.waitForTimeout(4200);

  // 7b: restore Generate On, clear Month -> click Process Payroll
  await generateSelect.selectOption('Attendance');
  await page.waitForTimeout(300);
  const monthInput = page.locator('input[type="month"]').first();
  await monthInput.fill('');
  await page.waitForTimeout(300);
  await processBtn.click();
  t = await getToastText();
  log('7b) Process Payroll with Month cleared -> toast:', JSON.stringify(t));
  results.item7b_process_missing_month_toast = t;
  await page.screenshot({ path: `${OUT}/27_process_missing_month.png` });
  await page.waitForTimeout(4200);

  // 7c note: Payroll Cycle cannot be forced empty (auto-fill effect
  // immediately repopulates it - confirmed separately), so the
  // "Missing Cycle" branch of handleProcessPayroll is source-verified only.
  results.item7c_note = 'Payroll Cycle field cannot be forced empty via the UI - a useEffect auto-repopulates it with the org\'s only active cycle whenever empty, confirmed via a dedicated probe (verify_cycle_autofill.mjs). The validation code exists and is correct (handleProcessPayroll checks !cycleId identically to the Filter button) but is unreachable live in this environment.';

  const currentMonth = new Date().toISOString().slice(0, 7);
  await monthInput.fill(currentMonth);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/28_process_payroll_restored.png`, fullPage: true });
  log('Screenshot 28 saved: fields restored to valid state (no destructive process actually run to avoid altering existing PUBLISHED run)');

  fs.writeFileSync(`${OUT}/part2_processpayroll_item7_results.json`, JSON.stringify(results, null, 2));

  await browser.close();
  log('Item 7 (Process Payroll validations) complete.');
})().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
