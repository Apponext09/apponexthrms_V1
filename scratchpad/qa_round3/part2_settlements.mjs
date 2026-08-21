import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'D:\\shakyadita_projects\\apponexthrms\\scratchpad\\qa_round3';
const BASE = 'http://localhost:5173';
const log = (...a) => console.log(new Date().toISOString(), ...a);
const results = {};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  const page = await context.newPage();
  page.on('console', msg => { if (msg.type() === 'error') log('PAGE ERROR:', msg.text()); });

  const netLog = [];
  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('/payroll/settlements')) {
      netLog.push({ url, method: resp.request().method(), status: resp.status() });
    }
  });

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', 'shakya@gmail.com');
  await page.fill('#password', 'shakya@gmail.com');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(1200);

  // =====================================================================
  // ITEM 1: Exit request flow via Team Exit Settlements (admin submits on
  // behalf of a team member) - EMP014 (Vivaan Iyer)
  // =====================================================================
  await page.goto(`${BASE}/manager/settlements`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  await page.click('button:has-text("Submit Exit Request")');
  await page.waitForTimeout(600);

  const REASON_TEXT = 'QA_ROUND3_TEST_REASON_EXIT_98765';
  // NOTE: TeamSettlementsPage's team-member dropdown reads emp.first_name /
  // emp.last_name (snake_case) with no camelCase fallback, so every option
  // renders as "EMP #<id> ()" instead of a real name (the /employees API
  // returns camelCase firstName/lastName). This is a separate, minor
  // display-only bug in that dropdown, not one of the 8 items under test -
  // selecting by option VALUE (employee id) works fine regardless.
  const opts = await page.locator('select option').allTextContents();
  log('Team member dropdown options (note: blank names is a pre-existing minor display bug, unrelated to items under test):', JSON.stringify(opts));
  await page.selectOption('select', '173'); // EMP014 - Vivaan Iyer

  // Fill exit date (tomorrow) and reason
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  await page.fill('input[type="date"]', tomorrow);
  await page.fill('input[placeholder*="Resignation"]', REASON_TEXT);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/11_exit_request_form_filled.png`, fullPage: true });
  log('Screenshot 11 saved: exit request form filled with reason', REASON_TEXT);

  await page.click('button:has-text("Submit Exit Request to HR")');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/12_exit_request_submitted.png`, fullPage: true });
  log('Screenshot 12 saved: after submitting exit request');

  // =====================================================================
  // Navigate to admin Exit Settlements (FnF) page to check Pending tab
  // =====================================================================
  await page.goto(`${BASE}/payroll/settlements`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Baseline screenshot before any admin actions (for tile vs list comparison, item 5)
  await page.screenshot({ path: `${OUT}/13_fnf_pending_tab_baseline.png`, fullPage: true });
  log('Screenshot 13 saved: FnF Pending tab baseline (should include EMP014 exit_requested with real reason)');

  // Capture the row text for the exit-requested employee to see what reason is shown
  const pendingRowsText = await page.locator('table tbody tr').allTextContents();
  log('Pending tab rows:', JSON.stringify(pendingRowsText, null, 2));
  results.item1_pendingRowsAfterExitRequest = pendingRowsText;

  // =====================================================================
  // ITEM 2: Create a Full & Final Settlement for EMP013 (Diya Kapoor) and
  // verify real calculated Gratuity / Leave Encashment via API
  // =====================================================================
  const initBtn = page.locator('button:has-text("Initialize Exit FnF")');
  if (await initBtn.count() === 0) {
    await page.screenshot({ path: `${OUT}/13b_DEBUG_no_init_button.png`, fullPage: true });
    log('DEBUG: Initialize FnF button not found, dumping visible button texts');
    const allBtnTexts = await page.locator('button').allTextContents();
    log('All button texts on page:', JSON.stringify(allBtnTexts));
  }
  await initBtn.first().click();
  await page.waitForTimeout(600);

  const empSelect2 = page.locator('select').first();
  const empOptions = await empSelect2.locator('option').allTextContents();
  log('Initialize form employee options (first 10):', JSON.stringify(empOptions.slice(0, 10)));
  await empSelect2.selectOption({ label: /Diya Kapoor/ }).catch(async () => {
    log('Could not select Diya Kapoor by label, options were:', JSON.stringify(empOptions));
  });

  await page.fill('input[type="date"]', tomorrow);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/14_create_fnf_form.png`, fullPage: true });
  log('Screenshot 14 saved: Initialize FnF form for EMP013');

  await page.click('button:has-text("Create FnF Record")');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/15_create_fnf_result_banner.png`, fullPage: true });
  log('Screenshot 15 saved: result banner after Create (should show real calc or explicit dataWarnings, not silent flat number)');

  const successBannerText = await page.locator('text=/Full & Final Settlement|Settlement created/').first().innerText().catch(() => null);
  log('Create FnF success banner text:', successBannerText);
  results.item2_createBannerText = successBannerText;

  // Fetch the raw calculated settlement via API for EMP013 to get real figures
  const emp013Settlement = await page.evaluate(async () => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch('http://127.0.0.1:5000/api/v1/payroll/settlements', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await res.json();
    const list = json.data || json;
    return Array.isArray(list) ? list.find(s => Number(s.employeeId ?? s.employee_id) === 172) : null;
  });
  log('EMP013 (id 172) settlement raw data:', JSON.stringify(emp013Settlement, null, 2));
  results.item2_emp013Settlement = emp013Settlement;

  fs.writeFileSync(`${OUT}/part2_results_partial.json`, JSON.stringify(results, null, 2));

  // =====================================================================
  // ITEM 5 (baseline before items 3/4 mutate state): tile counts vs list
  // counts for Pending / Approved / Closed tabs
  // =====================================================================
  async function readTiles() {
    return page.evaluate(() => {
      const labels = ['Total FnF Records', 'Pending Approvals', 'Approved Settlements', 'Closed & Paid'];
      const out = {};
      for (const label of labels) {
        const p = Array.from(document.querySelectorAll('p')).find(el => el.textContent.trim() === label);
        if (p) {
          const h3 = p.parentElement.querySelector('h3');
          out[label] = h3 ? h3.textContent.trim() : null;
        } else {
          out[label] = 'LABEL_NOT_FOUND';
        }
      }
      return out;
    });
  }
  async function countTabRows(tabLabel) {
    await page.locator(`button:has-text("${tabLabel}")`).first().click();
    await page.waitForTimeout(700);
    const rows = await page.locator('table tbody tr').count();
    const emptyState = await page.locator('text=No Candidate Found').count();
    return emptyState > 0 ? 0 : rows;
  }

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const tilesBefore = await readTiles();
  const pendingCountBefore = await countTabRows('Pending');
  const approvedCountBefore = await countTabRows('Approved');
  const closedCountBefore = await countTabRows('Closed');
  log('TILES (before items 3/4):', JSON.stringify(tilesBefore));
  log('LIST COUNTS (before items 3/4): Pending=', pendingCountBefore, 'Approved=', approvedCountBefore, 'Closed=', closedCountBefore);
  results.item5_tilesBefore = tilesBefore;
  results.item5_listCountsBefore = { pendingCountBefore, approvedCountBefore, closedCountBefore };

  await page.screenshot({ path: `${OUT}/16_tiles_vs_pending_list.png`, fullPage: true });
  log('Screenshot 16 saved: tiles + Pending list for comparison');

  // =====================================================================
  // ITEM 3: Try to Approve a settlement that has NOT been submitted
  // (all current records are 'draft' or 'exit_requested', never 'submitted'
  // via this admin UI, since there is no "Submit for Approval" button here)
  // =====================================================================
  await page.locator('button:has-text("Pending")').first().click();
  await page.waitForTimeout(700);

  let approveErrorText = null;
  let approveResponseStatus = null;
  page.once('response', resp => {
    if (resp.url().includes('/admin-approve')) approveResponseStatus = resp.status();
  });
  const approveBtn = page.locator('button[title="Approve FnF Request"]').first();
  const approveBtnCount = await approveBtn.count();
  log('Approve buttons available in Pending tab:', approveBtnCount);
  if (approveBtnCount > 0) {
    await approveBtn.click();
    await page.waitForTimeout(1500);
    approveErrorText = await page.locator('.bg-rose-50, .text-rose-700').first().innerText().catch(() => null);
    log('Approve-without-submit result: response status =', approveResponseStatus, ' error banner text =', approveErrorText);
  }
  await page.screenshot({ path: `${OUT}/17_approve_not_submitted_result.png`, fullPage: true });
  log('Screenshot 17 saved: result of approving a non-submitted settlement');
  results.item3_approveResponseStatus = approveResponseStatus;
  results.item3_approveErrorText = approveErrorText;

  // =====================================================================
  // ITEM 4: Reject/Reverse a pending settlement, confirm it moves to the
  // Reverse tab (not silently reset to a fresh-looking draft)
  // =====================================================================
  await page.locator('button:has-text("Pending")').first().click();
  await page.waitForTimeout(700);

  let rejectResponseStatus = null;
  page.once('response', resp => {
    if (resp.url().includes('/admin-reject')) rejectResponseStatus = resp.status();
  });
  const reverseBtn = page.locator('button[title="Reverse Request"]').first();
  const reverseBtnCount = await reverseBtn.count();
  log('Reverse buttons available in Pending tab:', reverseBtnCount);
  if (reverseBtnCount > 0) {
    const rowTextBeforeReject = await reverseBtn.locator('xpath=ancestor::tr[1]').innerText().catch(() => null);
    await reverseBtn.click();
    await page.waitForTimeout(1500);
    log('Reject/Reverse action: response status =', rejectResponseStatus, 'row was:', rowTextBeforeReject);
    results.item4_rejectResponseStatus = rejectResponseStatus;
  }
  await page.screenshot({ path: `${OUT}/18_after_reverse_action.png`, fullPage: true });
  log('Screenshot 18 saved: Pending tab immediately after Reverse action (row should be gone)');

  // Now check the Reverse tab
  await page.locator('button:has-text("Reverse")').first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/19_reverse_tab.png`, fullPage: true });
  const reverseTabRows = await page.locator('table tbody tr').allTextContents();
  const reverseEmptyState = await page.locator('text=No Candidate Found').count();
  log('Screenshot 19 saved: Reverse tab contents. Rows:', JSON.stringify(reverseTabRows), 'emptyState:', reverseEmptyState);
  results.item4_reverseTabRows = reverseEmptyState > 0 ? [] : reverseTabRows;

  // =====================================================================
  // ITEM 5 (after mutation): re-check tiles vs lists to ensure they stay
  // in sync after a Reverse action changes counts
  // =====================================================================
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const tilesAfter = await readTiles();
  const pendingCountAfter = await countTabRows('Pending');
  const approvedCountAfter = await countTabRows('Approved');
  const closedCountAfter = await countTabRows('Closed');
  log('TILES (after items 3/4):', JSON.stringify(tilesAfter));
  log('LIST COUNTS (after items 3/4): Pending=', pendingCountAfter, 'Approved=', approvedCountAfter, 'Closed=', closedCountAfter);
  results.item5_tilesAfter = tilesAfter;
  results.item5_listCountsAfter = { pendingCountAfter, approvedCountAfter, closedCountAfter };
  await page.screenshot({ path: `${OUT}/20_tiles_vs_lists_after.png`, fullPage: true });
  log('Screenshot 20 saved: tiles + lists after mutations');

  fs.writeFileSync(`${OUT}/part2_results.json`, JSON.stringify(results, null, 2));
  log('FULL RESULTS:', JSON.stringify(results, null, 2));

  await browser.close();
  log('Part 2 (settlements: items 1-5) complete.');
})().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
