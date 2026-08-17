import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SS = __dirname;

const browser = await chromium.launch({ headless: true });

// --- Part 1: employee submits a loan request ---
const empContext = await browser.newContext({ viewport: { width: 1600, height: 1000 }, storageState: `${SS}/authState_employee.json` });
const empPage = await empContext.newPage();
const empNet = [];
empPage.on('response', res => { if (res.url().includes('/api/')) empNet.push(`${res.status()} ${res.request().method()} ${res.url()}`); });
empPage.on('console', msg => { if (msg.type() === 'error') console.log('EMP CONSOLE ERROR:', msg.text()); });

await empPage.goto('http://localhost:5173/manager/loans', { waitUntil: 'networkidle', timeout: 30000 });
await empPage.waitForTimeout(1500);

// Fill amount, tenure, reason
const amountInput = empPage.locator('input[type="number"]').first();
await amountInput.fill('10000');
const tenureInput = empPage.locator('input[type="number"]').nth(1);
await tenureInput.fill('6');
const reasonInput = empPage.locator('textarea').first();
if (await reasonInput.count() > 0) await reasonInput.fill('QA re-verification test loan - item 8 approve/reject flow');

await empPage.screenshot({ path: `${SS}/13a_loan_form_filled.png`, fullPage: true });

const submitBtn = empPage.locator('button:has-text("Submit Application")').first();
await submitBtn.click();
await empPage.waitForTimeout(2500);
await empPage.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await empPage.screenshot({ path: `${SS}/13b_after_submit.png`, fullPage: true });

const empBodyText = await empPage.locator('body').innerText();
console.log('=== Employee page tail after submit ===');
console.log(empBodyText.slice(-1200));
console.log('--- Employee-side API calls ---');
console.log(empNet.slice(-8).join('\n'));

await empContext.close();

// --- Part 2: admin views All Requests / Pending, approves it ---
const adminContext = await browser.newContext({ viewport: { width: 1600, height: 1000 }, storageState: `${SS}/authState.json` });
const adminPage = await adminContext.newPage();
const adminNet = [];
adminPage.on('response', res => { if (res.url().includes('/api/')) adminNet.push(`${res.status()} ${res.request().method()} ${res.url()}`); });
adminPage.on('console', msg => { if (msg.type() === 'error') console.log('ADMIN CONSOLE ERROR:', msg.text()); });

await adminPage.goto('http://localhost:5173/payroll/loans', { waitUntil: 'networkidle', timeout: 30000 });
await adminPage.waitForTimeout(2000);
await adminPage.screenshot({ path: `${SS}/13c_admin_loans_before_approve.png`, fullPage: true });

const bodyText2 = await adminPage.locator('body').innerText();
const idx = bodyText2.indexOf('TOTAL APPLICATIONS');
console.log('=== Admin tiles before approve ===');
console.log(bodyText2.slice(idx, idx + 300));

// Click Pending tab
await adminPage.locator('button:has-text("Pending")').first().click();
await adminPage.waitForTimeout(1500);
await adminPage.screenshot({ path: `${SS}/13d_pending_tab.png`, fullPage: true });

const approveBtn = adminPage.locator('button:has-text("Approve")').first();
const approveCount = await adminPage.locator('button:has-text("Approve")').count();
console.log('Approve buttons found:', approveCount);

if (approveCount > 0) {
  await approveBtn.click();
  await adminPage.waitForTimeout(2500);
  await adminPage.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await adminPage.screenshot({ path: `${SS}/13e_after_approve.png`, fullPage: true });
  const bodyText3 = await adminPage.locator('body').innerText();
  console.log('=== Admin page tail after approve click ===');
  console.log(bodyText3.slice(-1000));
}

console.log('--- Admin-side API calls (last 10) ---');
console.log(adminNet.slice(-10).join('\n'));

await browser.close();
