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

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', 'shakya@gmail.com');
  await page.fill('#password', 'shakya@gmail.com');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(1200);

  await page.goto(`${BASE}/payroll/settings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator('button', { hasText: /^Components Catalog$/ }).first().click().catch(async () => {
    await page.click('text=Components Catalog');
  });
  await page.waitForTimeout(1200);

  async function getToastText() {
    await page.waitForTimeout(900);
    const toasts = page.locator('[data-sonner-toast]');
    const count = await toasts.count();
    if (count === 0) return null;
    return toasts.last().innerText();
  }

  // ===================================================================
  // 8a: Force a 500 on PUT /payroll/component-definitions/* and confirm
  // a genuine error toast appears (not a false "success")
  // ===================================================================
  await page.route('**/payroll/component-definitions/**', async route => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Simulated network failure (QA test)' }) });
    } else {
      await route.continue();
    }
  });

  const compPencil = page.locator('button[title="Edit Component Information"]').first();
  await compPencil.click();
  await page.waitForTimeout(1000);
  const compNameField = page.locator('input').first();
  const originalName = await compNameField.inputValue();
  await compNameField.fill(originalName + ' (qa test edit)');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/35_component_edit_before_forced_failure.png` });

  const updateBtn = page.locator('button', { hasText: 'Update' }).last();
  await updateBtn.click();
  const compErrorToast = await getToastText();
  log('8a) Component save forced 500 -> toast shown:', JSON.stringify(compErrorToast));
  results.item8a_componentForcedFailureToast = compErrorToast;
  await page.screenshot({ path: `${OUT}/36_component_edit_forced_failure_toast.png` });

  await page.unroute('**/payroll/component-definitions/**');

  // Verify the bad edit was NOT actually saved (server never received a
  // successful write) by reloading and checking the name reverted
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('button', { hasText: /^Components Catalog$/ }).first().click().catch(() => {});
  await page.waitForTimeout(1000);
  const rowTexts = await page.locator('table tbody tr').allTextContents();
  const stillHasBadEdit = rowTexts.some(t => t.includes('(qa test edit)'));
  log('After forced-failure attempt, does any row show the unsaved edit text? (should be false):', stillHasBadEdit);
  results.item8a_editIncorrectlyPersisted = stillHasBadEdit;

  // ===================================================================
  // 8b: Force a 500 on PUT /payroll/component-groups/* and confirm a
  // genuine error toast for Group edit too
  // ===================================================================
  await page.route('**/payroll/component-groups/**', async route => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Simulated network failure (QA test)' }) });
    } else {
      await route.continue();
    }
  });

  const groupPencilCount = await page.locator('button[title="Edit Group Settings"]').count();
  log('DEBUG: Edit Group Settings buttons found:', groupPencilCount);
  if (groupPencilCount === 0) {
    await page.screenshot({ path: `${OUT}/37_DEBUG_no_group_pencil.png`, fullPage: true });
  }
  const groupPencil = page.locator('button[title="Edit Group Settings"]').first();
  await groupPencil.click();
  await page.waitForTimeout(1000);
  const displayOrderInput = page.locator('input[type="number"]').first();
  await displayOrderInput.fill('999');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/37_group_edit_before_forced_failure.png` });

  const groupUpdateBtnTexts = await page.locator('button').allTextContents();
  log('DEBUG: all button texts on group edit panel:', JSON.stringify(groupUpdateBtnTexts.filter(t => t.includes('Update') || t.includes('Cancel'))));
  const groupUpdateBtn = page.locator('button', { hasText: /Update/ }).last();
  await groupUpdateBtn.click();
  const groupErrorToast = await getToastText();
  log('8b) Group save forced 500 -> toast shown:', JSON.stringify(groupErrorToast));
  results.item8b_groupForcedFailureToast = groupErrorToast;
  await page.screenshot({ path: `${OUT}/38_group_edit_forced_failure_toast.png` });

  await page.unroute('**/payroll/component-groups/**');

  fs.writeFileSync(`${OUT}/part2_item8_results.json`, JSON.stringify(results, null, 2));
  log('FULL RESULTS item 8:', JSON.stringify(results, null, 2));

  await browser.close();
  log('Item 8 (forced failure error handling) complete.');
})().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
