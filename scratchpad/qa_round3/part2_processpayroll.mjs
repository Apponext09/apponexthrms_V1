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

  // Make sure we're on "Process Payroll" tab (there may be tabs at top - reuse default if only one)
  await page.screenshot({ path: `${OUT}/21_process_payroll_landing.png`, fullPage: true });
  log('Screenshot 21 saved: Process Payroll landing state');

  async function getToastText() {
    await page.waitForTimeout(600);
    const toasts = page.locator('[data-sonner-toast]');
    const count = await toasts.count();
    if (count === 0) return null;
    return toasts.last().innerText();
  }
  async function dismissToasts() {
    // click elsewhere / wait for toast auto-dismiss
    await page.waitForTimeout(4200);
  }

  // ==========================================================
  // ITEM 6: Filter button validations
  // ==========================================================
  // 6a: Filter with NOTHING selected (generateOnMode = "- Select -", cycle empty)
  await page.locator('button:has-text("Filter")').first().click();
  let t = await getToastText();
  log('6a) Filter with nothing selected -> toast:', JSON.stringify(t));
  results.item6a_filter_nothing_selected_toast = t;
  await page.screenshot({ path: `${OUT}/22_filter_missing_generateOn.png` });
  await dismissToasts();

  // 6b: Set Generate Payroll On, leave Cycle empty -> Filter
  const generateSelect = page.locator('select').filter({ has: page.locator('option[value="Attendance"]') }).first();
  await generateSelect.selectOption('Attendance');
  await page.waitForTimeout(300);
  await page.locator('button:has-text("Filter")').first().click();
  t = await getToastText();
  log('6b) Filter with Generate On set, Cycle empty -> toast:', JSON.stringify(t));
  results.item6b_filter_missing_cycle_toast = t;
  await page.screenshot({ path: `${OUT}/23_filter_missing_cycle.png` });
  await dismissToasts();

  // 6c: Set Cycle, clear Month -> Filter
  const cycleSelect = page.locator('select').nth(1);
  const cycleOptions = await cycleSelect.locator('option').allTextContents();
  log('Cycle options:', JSON.stringify(cycleOptions));
  if (cycleOptions.length > 1) {
    await cycleSelect.selectOption({ index: 1 });
  }
  await page.waitForTimeout(300);
  const monthInput = page.locator('input[type="month"]').first();
  await monthInput.fill('');
  await page.waitForTimeout(300);
  await page.locator('button:has-text("Filter")').first().click();
  t = await getToastText();
  log('6c) Filter with Cycle set, Month cleared -> toast:', JSON.stringify(t));
  results.item6c_filter_missing_month_toast = t;
  await page.screenshot({ path: `${OUT}/24_filter_missing_month.png` });
  await dismissToasts();

  // 6d (sanity/regression check): with all three set, Filter should NOT show
  // an error toast, and the register should NOT have already auto-loaded
  // before Filter was clicked (previously it auto-fetched on every dropdown
  // change even before Filter was pressed)
  const currentMonth = new Date().toISOString().slice(0, 7);
  await monthInput.fill(currentMonth);
  await page.waitForTimeout(500);
  // Check register state BEFORE clicking filter this time (should still be empty/prompting)
  const preFilterBodyText = await page.locator('body').innerText();
  const hadNoFilterYetMessage = preFilterBodyText.includes('Select filters and click Filter');
  log('6d) Before clicking Filter (after 3 valid selections): register shows "Select filters..." prompt =', hadNoFilterYetMessage);
  results.item6d_noAutoLoadBeforeFilterClick = hadNoFilterYetMessage;

  await page.locator('button:has-text("Filter")').first().click();
  await page.waitForTimeout(2500);
  t = await getToastText();
  log('6d) Filter with all 3 valid -> toast (should be null/no error):', JSON.stringify(t));
  results.item6d_filter_valid_toast = t;
  await page.screenshot({ path: `${OUT}/25_filter_valid_all_set.png`, fullPage: true });

  fs.writeFileSync(`${OUT}/part2_processpayroll_results.json`, JSON.stringify(results, null, 2));

  await browser.close();
  log('Item 6 (Filter validations) complete.');
})().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
