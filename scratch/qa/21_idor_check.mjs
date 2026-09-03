import { chromium } from 'playwright';

const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, storageState: STATE });
const page = await context.newPage();

await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);
const token = await page.evaluate(() => localStorage.getItem('accessToken'));

// Try accessing payroll runs by ID that might belong to another org (IDs 1-26, ours is 27)
for (const id of [1, 5, 10, 15, 20, 26]) {
  try {
    const res = await fetch(`http://127.0.0.1:5000/api/v1/payroll/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const body = await res.text();
    console.log(`GET /payroll/${id} -> status ${res.status}, bodyLen=${body.length}, preview=${body.slice(0,200)}`);
  } catch (e) { console.log(id, 'error', e.message); }
}

// Try accessing an employee by an ID far outside our known range (org 14 employees are ~51-70ish and 171-180)
console.log('\n--- Employee IDOR checks ---');
for (const id of [1, 2, 3, 100, 200]) {
  try {
    const res = await fetch(`http://127.0.0.1:5000/api/v1/employees/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const body = await res.text();
    console.log(`GET /employees/${id} -> status ${res.status}, preview=${body.slice(0,200)}`);
  } catch (e) { console.log(id, 'error', e.message); }
}

await browser.close();
