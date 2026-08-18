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

  await page.goto(`${BASE}/payroll/settlements`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  await page.locator('button:has-text("Initialize Exit FnF")').first().click();
  await page.waitForTimeout(600);

  const empSelect = page.locator('select').first();
  const empOptions = await empSelect.locator('option').allTextContents();
  log('Employee options:', JSON.stringify(empOptions));

  // Diya Kapoor (EMP013, employee id 172) - no active settlement yet
  await empSelect.selectOption({ label: 'Diya Kapoor (EMP013)' });
  await page.waitForTimeout(300);

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  await page.fill('input[type="date"]', tomorrow);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/14_create_fnf_form.png`, fullPage: true });
  log('Screenshot 14 saved (corrected): Initialize FnF form for EMP013 selected');

  let calcResponseBody = null;
  page.on('response', async resp => {
    if (resp.url().includes('/calculate') && resp.request().method() === 'POST') {
      try { calcResponseBody = await resp.json(); } catch {}
    }
  });

  await page.locator('button:has-text("Create FnF Record")').click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/15_create_fnf_result_banner.png`, fullPage: true });
  log('Screenshot 15 saved (corrected): result banner after Create');

  const bannerLocator = page.locator('.bg-emerald-50, .bg-rose-50').first();
  const bannerText = await bannerLocator.innerText().catch(() => null);
  log('Create FnF result banner text:', bannerText);
  results.item2_createBannerText = bannerText;
  results.item2_calculateApiResponse = calcResponseBody;

  const emp013Settlement = await page.evaluate(async () => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch('http://127.0.0.1:5000/api/v1/payroll/settlements', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await res.json();
    const list = json.data || json;
    return Array.isArray(list) ? list.find(s => Number(s.employeeId ?? s.employee_id) === 172) : null;
  });
  log('EMP013 (id 172) settlement raw data after create+calculate:', JSON.stringify(emp013Settlement, null, 2));
  results.item2_emp013Settlement = emp013Settlement;

  fs.writeFileSync(`${OUT}/part2_item2_results.json`, JSON.stringify(results, null, 2));

  await browser.close();
  log('Item 2 (corrected) complete.');
})().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
