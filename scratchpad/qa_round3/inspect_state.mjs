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
    const [empsRes, settlementsRes] = await Promise.all([
      fetch('http://127.0.0.1:5000/api/v1/employees', { headers }),
      fetch('http://127.0.0.1:5000/api/v1/payroll/settlements', { headers })
    ]);
    const emps = await empsRes.json();
    const settlements = await settlementsRes.json();
    return { emps: emps.data || emps, settlements: settlements.data || settlements };
  });

  const emps = (result.emps || []).map(e => ({
    id: e.id, code: e.employeeCode || e.employee_code, name: `${e.firstName||e.first_name||''} ${e.lastName||e.last_name||''}`.trim()
  }));
  const settlements = (result.settlements || []).map(s => ({
    id: s.id, employeeId: s.employeeId ?? s.employee_id, status: s.status,
    notes: s.settlementNotes ?? s.settlement_notes, gratuity: s.gratuityAmount ?? s.gratuity_amount,
    leaveEnc: s.leaveEncashmentAmount ?? s.leave_encashment_amount
  }));

  console.log('EMPLOYEES:', JSON.stringify(emps, null, 2));
  console.log('SETTLEMENTS:', JSON.stringify(settlements, null, 2));

  await browser.close();
})();
