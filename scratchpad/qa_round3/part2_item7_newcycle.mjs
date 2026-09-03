import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'D:\\shakyadita_projects\\apponexthrms\\scratchpad\\qa_round3';
const BASE = 'http://localhost:5173';
const log = (...a) => console.log(new Date().toISOString(), ...a);
const results = {};
const NEW_CYCLE_NAME = 'QA_ROUND3_TEST_CYCLE';

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

  // Create a fresh payroll cycle with zero runs, so "1. Process Payroll" is
  // enabled and its validations can be exercised without touching the
  // existing published run on the org's only other cycle.
  await page.goto(`${BASE}/payroll/settings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator('button', { hasText: /^Cycles$/ }).first().click();
  await page.waitForTimeout(1000);

  await page.locator('button:has-text("Add New Master Payroll")').click();
  await page.waitForTimeout(500);
  await page.fill('input[placeholder="e.g. Monthly, Weekly"]', NEW_CYCLE_NAME);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/29_new_cycle_form.png`, fullPage: true });

  const saveBtn = page.locator('button', { hasText: /Save Cycle/ }).first();
  await saveBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/30_new_cycle_saved.png`, fullPage: true });
  log('New test cycle created:', NEW_CYCLE_NAME);

  // Go to Process Payroll, select the new cycle
  await page.goto(`${BASE}/payroll/processing`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const cycleSelect = page.locator('select').filter({ has: page.locator('option[value=""]') }).first();
  const cycleOptions = await cycleSelect.locator('option').allTextContents();
  log('Cycle options on Process Payroll:', JSON.stringify(cycleOptions));
  await cycleSelect.selectOption({ label: NEW_CYCLE_NAME });
  await page.waitForTimeout(1000);

  const processBtn = page.locator('button', { hasText: /^1\./ }).first();
  const btnText = await processBtn.innerText();
  const btnDisabled = await processBtn.isDisabled();
  log('Process button text with new cycle selected:', btnText, 'disabled:', btnDisabled);
  results.newCycleProcessButtonText = btnText;
  results.newCycleProcessButtonDisabled = btnDisabled;
  await page.screenshot({ path: `${OUT}/31_process_payroll_new_cycle_selected.png`, fullPage: true });

  async function getToastText() {
    await page.waitForTimeout(700);
    const toasts = page.locator('[data-sonner-toast]');
    const count = await toasts.count();
    if (count === 0) return null;
    return toasts.last().innerText();
  }

  if (!btnDisabled) {
    // 7a: Generate Payroll On = "- Select -"
    const generateSelect = page.locator('select').filter({ has: page.locator('option[value="- Select -"]') }).first();
    await generateSelect.selectOption('- Select -');
    await page.waitForTimeout(300);
    await processBtn.click();
    let t = await getToastText();
    log('7a) [new cycle] Process Payroll with Generate On unset -> toast:', JSON.stringify(t));
    results.item7a_toast = t;
    await page.screenshot({ path: `${OUT}/32_process_missing_generateOn_newcycle.png` });
    await page.waitForTimeout(4200);

    // 7b: restore Generate On, clear Month
    await generateSelect.selectOption('Attendance');
    await page.waitForTimeout(300);
    const monthInput = page.locator('input[type="month"]').first();
    await monthInput.fill('');
    await page.waitForTimeout(300);
    await processBtn.click();
    t = await getToastText();
    log('7b) [new cycle] Process Payroll with Month cleared -> toast:', JSON.stringify(t));
    results.item7b_toast = t;
    await page.screenshot({ path: `${OUT}/33_process_missing_month_newcycle.png` });
    await page.waitForTimeout(4200);

    // Restore month; deliberately DO NOT click Process with all valid fields,
    // to avoid creating a real payroll run as a side effect of a QA script.
    await monthInput.fill(new Date().toISOString().slice(0, 7));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/34_process_payroll_fields_restored.png`, fullPage: true });
  } else {
    log('WARNING: Process button unexpectedly disabled even for brand-new cycle - dumping page state');
  }

  fs.writeFileSync(`${OUT}/part2_item7_newcycle_results.json`, JSON.stringify(results, null, 2));

  await browser.close();
  log('Item 7 (new cycle) complete.');
})().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
