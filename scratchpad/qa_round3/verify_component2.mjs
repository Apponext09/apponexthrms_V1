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
    const res = await fetch('http://127.0.0.1:5000/api/v1/payroll/component-definitions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await res.json();
    const list = json.data || json;
    const comp2 = Array.isArray(list) ? list.find(c => String(c.id) === '2') : null;
    return { status: res.status, comp2 };
  });

  console.log('Component ID 2 raw API data:', JSON.stringify(result, null, 2));

  await browser.close();
})();
