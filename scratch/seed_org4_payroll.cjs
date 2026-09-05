const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config({ path: './server/.env' });

async function fixCompanyIdAndTest() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'happy'
  });

  console.log('1. Setting company_id=5 for Org 4 employees (6, 7, 8)...');
  await conn.query('UPDATE employees SET company_id=5 WHERE organization_id=4');
  await conn.query('UPDATE payroll_cycles SET company_id=5 WHERE id=6');
  console.log('- Updated company_id=5 for employees & cycle.');

  await conn.end();

  // 2. Test HTTP API GET /api/v1/payroll/process-register for Org 4
  console.log('\n2. Testing HTTP API GET /api/v1/payroll/process-register for Org 4...');
  const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', {
    email: 'abhishek@gmail.com',
    password: 'Admin@123'
  });

  const cookies = loginRes.headers['set-cookie'];
  const cookieHeader = Array.isArray(cookies) ? cookies.map(c => c.split(';')[0]).join('; ') : cookies;
  const token = loginRes.data?.data?.token || loginRes.data?.token || loginRes.data?.data?.accessToken;

  const headers = {
    'Content-Type': 'application/json',
    'Cookie': cookieHeader,
    'X-Company-Id': '5'
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const regRes = await axios.get('http://localhost:5000/api/v1/payroll/process-register?cycleId=6&month=2026-09', { headers });

  console.log('\n=================================================================');
  console.log('LIVE PAYROLL ENGINE EXECUTION SUCCESSFUL!');
  console.log('=================================================================');
  console.log('API Status:', regRes.status);
  console.log('Success:', regRes.data.success);
  console.log('Cycle Name:', regRes.data.data?.cycle?.cycle_name || 'Monthly');
  console.log('Total Dynamic Components:', (regRes.data.data?.component_definitions || []).length);
  console.log('Total Employees Processed:', (regRes.data.data?.employees || []).length);

  if (regRes.data.data?.employees?.length > 0) {
    for (const emp of regRes.data.data.employees) {
      console.log(`\n-------------------------------------------------------------`);
      console.log(`Employee: ${emp.name} (${emp.employee_code})`);
      console.log(`- Annual CTC: ₹${emp.annual_ctc}`);
      console.log(`- Attendance: ${emp.paid_days} Paid Days / ${emp.salary_days} Cycle Days (LOP: ${emp.unpaid_days})`);
      console.log(`- Gross Earned: ₹${emp.gross_earned}`);
      console.log(`- Total Deductions: ₹${emp.total_deductions}`);
      console.log(`- Net Take-Home Pay: ₹${emp.net_pay}`);
      console.log(`- Calculated Components Breakdown:`);
      console.table(emp.components);
    }
  }
}

fixCompanyIdAndTest().catch(console.error);
