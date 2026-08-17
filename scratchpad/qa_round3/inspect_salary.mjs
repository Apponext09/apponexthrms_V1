import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', 'shakya@gmail.com');
  await page.fill('#password', 'shakya@gmail.com');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(1000);

  const result = await page.evaluate(async () => {
    const token = localStorage.getItem('accessToken');
    const headers = { Authorization: `Bearer ${token}` };
    const ids = [172, 173, 174, 175, 176];
    const out = {};
    for (const id of ids) {
      try {
        const r = await fetch(`http://127.0.0.1:5000/api/v1/payroll/salary-structures?employeeId=${id}`, { headers });
        out[id] = await r.json();
      } catch (e) { out[id] = { error: String(e) }; }
    }
    return out;
  });

  console.log('SALARY STRUCTURES:', JSON.stringify(result, null, 2));

  await browser.close();
})();
