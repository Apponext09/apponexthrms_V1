import { chromium } from 'playwright';

const SS = 'C:\\Users\\armys\\AppData\\Local\\Temp\\claude\\d--shakyadita-projects-apponexthrms\\63e00e3a-9960-4cb8-8315-e1db0b48de99\\scratchpad\\';
const STATE = 'D:\\shakyadita_projects\\apponexthrms\\scratch\\qa\\storageState.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, storageState: STATE });
const page = await context.newPage();

await page.goto('http://localhost:5173/payroll/processing', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);
const token = await page.evaluate(() => localStorage.getItem('accessToken'));

const results = await page.evaluate(async (tok) => {
  const out = [];
  // 1. Legit authenticated call
  const r1 = await fetch('http://127.0.0.1:5000/api/v1/payroll/process-register?month=2026-08', {
    headers: { Authorization: `Bearer ${tok}` }
  });
  out.push({ label: '1) WITH valid Bearer token', url: '/api/v1/payroll/process-register?month=2026-08', status: r1.status, body: (await r1.text()).slice(0, 220) });

  // 2. No auth header at all
  const r2 = await fetch('http://127.0.0.1:5000/api/v1/payroll/process-register?month=2026-08');
  out.push({ label: '2) NO Authorization header', url: '/api/v1/payroll/process-register?month=2026-08', status: r2.status, body: (await r2.text()).slice(0, 220) });

  // 3. Invalid/garbage token
  const r3 = await fetch('http://127.0.0.1:5000/api/v1/payroll/process-register?month=2026-08', {
    headers: { Authorization: 'Bearer invalid.garbage.token123' }
  });
  out.push({ label: '3) INVALID/garbage token', url: '/api/v1/payroll/process-register?month=2026-08', status: r3.status, body: (await r3.text()).slice(0, 220) });

  // 4. Employee list without auth
  const r4 = await fetch('http://127.0.0.1:5000/api/v1/employees');
  out.push({ label: '4) NO auth, /employees (roster incl. salary-linked slab data)', url: '/api/v1/employees', status: r4.status, body: (await r4.text()).slice(0, 220) });

  // 5. Loans list without auth
  const r5 = await fetch('http://127.0.0.1:5000/api/v1/payroll/loans');
  out.push({ label: '5) NO auth, /payroll/loans', url: '/api/v1/payroll/loans', status: r5.status, body: (await r5.text()).slice(0, 220) });

  return out;
}, token);

const rows = results.map(r => `
  <div style="margin-bottom:22px;border:1px solid #ccc;border-radius:8px;padding:14px 18px;background:${r.status===200?'#eafbea':'#fdeaea'}">
    <div style="font-weight:700;font-size:15px;margin-bottom:4px;">${r.label}</div>
    <div style="font-family:monospace;font-size:13px;color:#333;">GET ${r.url}</div>
    <div style="font-family:monospace;font-size:14px;margin-top:6px;"><b>Status: <span style="color:${r.status===200?'#0a0':'#c00'}">${r.status}</span></b></div>
    <div style="font-family:monospace;font-size:12px;margin-top:6px;white-space:pre-wrap;word-break:break-all;color:#555;">${r.body.replace(/</g,'&lt;')}</div>
  </div>`).join('\n');

await page.setContent(`
  <html><body style="font-family:Arial, sans-serif;padding:24px;background:#f7f7f9;">
  <h2>Payroll API Auth Enforcement Test — Org 14 (sonex1)</h2>
  <p>Testing <code>/api/v1/payroll/process-register</code>, <code>/api/v1/employees</code>, <code>/api/v1/payroll/loans</code> with and without valid auth.</p>
  ${rows}
  </body></html>
`);
await page.screenshot({ path: SS + '08b-security-auth-test-results.png', fullPage: true });
console.log('Security screenshot saved');
console.log(JSON.stringify(results.map(r=>({label:r.label,status:r.status})), null, 1));

await browser.close();
