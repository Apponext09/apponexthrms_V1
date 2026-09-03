import { chromium } from 'playwright';

const outDir = 'scratchpad/screenshots';
await import('node:fs').then(fs => fs.mkdirSync(outDir, { recursive: true }));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const consoleErrors = [];
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + err.message));

try {
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${outDir}/01_login.png` });

  // Try to find email/password fields
  const emailSel = 'input[type="email"], input[name="email"], input[placeholder*="mail" i]';
  const passSel = 'input[type="password"], input[name="password"]';
  await page.waitForSelector(emailSel, { timeout: 15000 });
  await page.fill(emailSel, 'abhishek@gmail.com');
  await page.fill(passSel, 'abhishek@gmail.com');
  await page.screenshot({ path: `${outDir}/02_login_filled.png` });

  const submitBtn = page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in"), button:has-text("Login")').first();
  await submitBtn.click();

  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${outDir}/03_after_login.png` });
  console.log('URL after login:', page.url());

  // Navigate to Payroll Dashboard
  await page.goto('http://localhost:5173/payroll', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${outDir}/04_payroll_dashboard.png`, fullPage: true });
  console.log('URL now:', page.url());

  // Try clicking each lifecycle step card
  const stepCards = page.locator('text=/Attendance Cutoff|LOP & Leave Ingest|Live Calculation|Lock & Disburse/');
  const count = await stepCards.count();
  console.log('lifecycle step cards found:', count);

  // Try "Run Payroll Pipeline" button
  const runBtn = page.locator('button:has-text("Run Payroll Pipeline")').first();
  if (await runBtn.count()) {
    await runBtn.click().catch(e => console.log('run pipeline click error:', e.message));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${outDir}/05_run_pipeline_click.png`, fullPage: true });
  }

  // Try "Mass Upload CSV" button
  await page.goto('http://localhost:5173/payroll', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const massBtn = page.locator('button:has-text("Mass Upload CSV")').first();
  if (await massBtn.count()) {
    await massBtn.click().catch(e => console.log('mass upload click error:', e.message));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${outDir}/06_mass_upload_click.png`, fullPage: true });
  }

  // Try clicking a "Step 3" lifecycle card
  await page.goto('http://localhost:5173/payroll', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const step3 = page.locator('text=Live Calculation').first();
  if (await step3.count()) {
    await step3.click().catch(e => console.log('step3 click error:', e.message));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${outDir}/07_step3_click.png`, fullPage: true });
    console.log('URL after step3 click:', page.url());
  }

  // Check sidebar sub-pages: Payroll Reports, Payslip Management
  for (const [label, url] of [['reports', 'http://localhost:5173/payroll/reports'], ['payslips', 'http://localhost:5173/payroll/payslips'], ['settings', 'http://localhost:5173/payroll/settings']]) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(()=>{});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${outDir}/08_${label}.png`, fullPage: true });
  }

  // Resize to mobile viewport and recheck dashboard
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5173/payroll', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${outDir}/09_mobile_dashboard.png`, fullPage: true });

  console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrors, null, 2));
} catch (e) {
  console.error('TEST SCRIPT ERROR:', e);
  await page.screenshot({ path: `${outDir}/error.png` }).catch(()=>{});
} finally {
  await browser.close();
}
