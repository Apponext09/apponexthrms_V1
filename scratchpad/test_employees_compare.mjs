import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[type="email"]', { timeout: 15000 });
await page.fill('input[type="email"]', 'abhishek@gmail.com');
await page.fill('input[type="password"]', 'abhishek@gmail.com');
await page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first().click();
await page.waitForTimeout(3000);

const result = await page.evaluate(async () => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('authToken');
  const keys = Object.keys(localStorage);
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const r1 = await fetch('/api/v1/employees?pageSize=500', { headers, credentials: 'include' });
  const d1 = await r1.json();
  const r2 = await fetch('/api/v1/employees?pageSize=500&limit=500', { headers, credentials: 'include' });
  const d2 = await r2.json();

  return { keys, tokenFound: !!token, withoutLimit: { total: d1?.meta?.total, count: d1?.data?.length }, withLimit: { total: d2?.meta?.total, count: d2?.data?.length } };
});
console.log(JSON.stringify(result, null, 2));

await browser.close();
