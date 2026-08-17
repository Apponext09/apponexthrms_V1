import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const log = (...a) => console.log(new Date().toISOString(), ...a);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1700, height: 1100 } });
  const page = await context.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', 'shakya@gmail.com');
  await page.fill('#password', 'shakya@gmail.com');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(1200);

  await page.goto(`${BASE}/payroll/processing`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const cycleSelect = page.locator('select').filter({ has: page.locator('option[value=""]:has-text("- Select -")') }).first();
  const valBefore = await cycleSelect.inputValue();
  log('Cycle select value BEFORE manual reset:', valBefore);

  await cycleSelect.selectOption('');
  await page.waitForTimeout(800);
  const valImmediatelyAfter = await cycleSelect.inputValue();
  log('Cycle select value RIGHT AFTER selecting blank option (then waited 800ms):', valImmediatelyAfter);

  await browser.close();
})();
