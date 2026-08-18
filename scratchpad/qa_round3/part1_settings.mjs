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

  let saveResponseStatus = null;
  let saveResponseUrl = null;
  page.on('response', resp => {
    const url = resp.url();
    if (url.includes('/payroll/component-definitions') && resp.request().method() === 'PUT') {
      saveResponseStatus = resp.status();
      saveResponseUrl = url;
    }
  });

  // ---------- LOGIN ----------
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', 'shakya@gmail.com');
  await page.fill('#password', 'shakya@gmail.com');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  log('Logged in, landed on', page.url());
  await page.waitForTimeout(1500);

  // ---------- NAVIGATE TO PAYROLL MASTER SETTINGS ----------
  await page.goto(`${BASE}/payroll/settings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.click('text=Components Catalog');
  await page.waitForTimeout(1200);

  const earningBtn = page.locator('button:has-text("Earning")').first();
  await earningBtn.click().catch(() => {});
  await page.waitForTimeout(800);

  // Screenshot 1: default Component Groups list view (Earning/Deduction toggle visible)
  await page.screenshot({ path: `${OUT}/01_component_groups_list.png`, fullPage: true });
  log('Screenshot 1 saved: component groups list (Earning active)');

  await page.locator('button:has-text("Deduction")').first().click().catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/01b_component_groups_deduction.png`, fullPage: true });
  log('Screenshot 1b saved: component groups list (Deduction active)');
  await earningBtn.click().catch(() => {});
  await page.waitForTimeout(600);

  // ---------- OPEN A GROUP FOR EDIT (left panel) via title="Edit Group Settings" ----------
  const groupPencil = page.locator('button[title="Edit Group Settings"]').first();
  await groupPencil.click();
  await page.waitForTimeout(1000);
  log('Opened group edit panel');

  await page.screenshot({ path: `${OUT}/02_group_edit_panel.png`, fullPage: true });
  log('Screenshot 2 saved: group edit panel (left side, Earning/Deduction toggle + Update Group Information fields)');

  // Cancel out of group edit without saving
  await page.locator('button:has-text("✕ Cancel")').first().click().catch(() => {});
  await page.waitForTimeout(600);

  // ---------- OPEN A COMPONENT FOR EDIT via title="Edit Component Information" ----------
  const compPencils = page.locator('button[title="Edit Component Information"]');
  const compPencilCount = await compPencils.count();
  log('Component pencil icons found (right-side quick table):', compPencilCount);

  let targetComponentName = null;
  if (compPencilCount > 0) {
    const row = compPencils.first().locator('xpath=ancestor::tr[1]');
    targetComponentName = (await row.innerText().catch(() => '')).split('\t')[0].trim();
    await compPencils.first().click();
  } else {
    log('WARNING: falling back to title="Edit Component" (group-card inline row pencil)');
    const altPencils = page.locator('button[title="Edit Component"]');
    if (await altPencils.count() > 0) {
      await altPencils.first().click();
    }
  }
  await page.waitForTimeout(1200);
  log('Opened component for edit. Target component (best guess):', targetComponentName);

  await page.screenshot({ path: `${OUT}/03_component_definition_panel_top.png`, fullPage: true });
  log('Screenshot 3 saved: Update Component Information panel (top: name/group/type/formula)');

  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/04_component_definition_panel_conditions.png`, fullPage: true });
  log('Screenshot 4 saved: Condition Setting / eligibility fields (gender, condition on/operator/value)');

  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/05_component_definition_panel_employment.png`, fullPage: true });
  log('Screenshot 5 saved: Employment Setting section (grade/department/location)');

  // scroll back to top for interaction
  await page.mouse.wheel(0, -2000);
  await page.waitForTimeout(400);

  // ---------- PERSISTENCE TEST: edit gender + a condition field, save, reload, verify ----------
  const allGenderBtns = await page.locator('button', { hasText: /^(✓ All|All|Male|Female)$/ }).all();
  let beforeGenderTexts = [];
  for (const b of allGenderBtns) {
    const cls = await b.getAttribute('class');
    const txt = (await b.innerText()).trim();
    beforeGenderTexts.push({ txt, selected: !!(cls && cls.includes('bg-indigo-600')) });
  }
  log('Gender buttons state BEFORE change:', JSON.stringify(beforeGenderTexts));

  const maleSelected = beforeGenderTexts.find(b => b.txt === 'Male')?.selected;
  const targetGenderLabel = maleSelected ? 'Female' : 'Male';
  const genderBtnToClick = page.locator('button', { hasText: new RegExp(`^${targetGenderLabel}$`) }).first();
  await genderBtnToClick.scrollIntoViewIfNeeded();
  await genderBtnToClick.click();
  await page.waitForTimeout(400);
  log('Clicked gender button:', targetGenderLabel);

  // Condition On / Operator / Value1
  const conditionOnSelect = page.locator('select').filter({ has: page.locator('option[value="Basic Pay"]') }).first();
  if (await conditionOnSelect.count() > 0) {
    await conditionOnSelect.selectOption('Basic Pay');
    log('Set Condition On = Basic Pay');
  }
  const conditionOperatorSelect = page.locator('select').filter({ has: page.locator('option[value=">"]') }).first();
  if (await conditionOperatorSelect.count() > 0) {
    await conditionOperatorSelect.selectOption('>');
    log('Set Operator = >');
  }
  const value1Input = page.locator('input[placeholder*="25 (Days)"]').first();
  if (await value1Input.count() > 0) {
    await value1Input.fill('15000');
    log('Set Value1 = 15000');
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/06_component_before_save_gender_condition.png` });
  log('Screenshot 6 saved: gender + condition set before saving');

  const updateButtons = page.locator('button', { hasText: 'Update' });
  const updateCount = await updateButtons.count();
  log('Update buttons visible:', updateCount);
  await updateButtons.last().click();
  await page.waitForTimeout(2500);
  log('Clicked Update on component form. PUT response status:', saveResponseStatus, saveResponseUrl);

  await page.screenshot({ path: `${OUT}/07_component_after_save_toast.png` });
  log('Screenshot 7 saved: after clicking Update (toast / panel state)');

  // ---------- RELOAD AND VERIFY PERSISTENCE ----------
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.click('text=Components Catalog').catch(() => {});
  await page.waitForTimeout(1000);
  await page.locator('button:has-text("Earning")').first().click().catch(() => {});
  await page.waitForTimeout(800);

  let reopened = false;
  if (targetComponentName) {
    const rowByName = page.locator('tr', { hasText: targetComponentName }).first();
    const pencilInRow = rowByName.locator('button[title="Edit Component Information"]');
    if (await pencilInRow.count() > 0) {
      await pencilInRow.click();
      reopened = true;
    }
  }
  if (!reopened) {
    const compPencilsAfter = page.locator('button[title="Edit Component Information"]');
    if (await compPencilsAfter.count() > 0) {
      await compPencilsAfter.first().click();
      reopened = true;
    }
  }
  await page.waitForTimeout(1200);
  log('Reopened component after reload:', reopened);

  await page.screenshot({ path: `${OUT}/08_component_reopened_top.png`, fullPage: true });
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/09_component_reopened_conditions.png`, fullPage: true });
  log('Screenshots 8-9 saved: reopened component after reload, to verify persistence');

  const allGenderBtnsAfter = await page.locator('button', { hasText: /^(✓ All|All|Male|Female)$/ }).all();
  let afterGenderTexts = [];
  for (const b of allGenderBtnsAfter) {
    const cls = await b.getAttribute('class');
    const txt = (await b.innerText()).trim();
    afterGenderTexts.push({ txt, selected: !!(cls && cls.includes('bg-indigo-600')) });
  }
  log('Gender buttons state AFTER reload:', JSON.stringify(afterGenderTexts));

  const persistedGenderSelected = afterGenderTexts.find(b => b.txt === targetGenderLabel)?.selected;

  results.targetComponentName = targetComponentName;
  results.targetGenderLabel = targetGenderLabel;
  results.saveResponseStatus = saveResponseStatus;
  results.persistedGenderSelected = !!persistedGenderSelected;
  results.beforeGenderTexts = beforeGenderTexts;
  results.afterGenderTexts = afterGenderTexts;

  fs.writeFileSync(`${OUT}/part1_results.json`, JSON.stringify(results, null, 2));
  log('RESULTS:', JSON.stringify(results, null, 2));

  await browser.close();
  log('Part 1 script complete.');
})().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
