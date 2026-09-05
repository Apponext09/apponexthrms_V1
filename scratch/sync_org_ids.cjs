const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config({ path: './server/.env' });

async function syncOrg() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'happy'
  });

  // 1. Test live HTTP GET /api/v1/payroll/process-register
  console.log('Testing live HTTP GET /api/v1/payroll/process-register with companyId=all...');
  const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', {
    email: 'abhishek@gmail.com',
    password: 'Admin@123'
  });

  const cookies = loginRes.headers['set-cookie'];
  const cookieHeader = Array.isArray(cookies) ? cookies.map(c => c.split(';')[0]).join('; ') : cookies;
  const token = loginRes.data?.data?.token || loginRes.data?.token || loginRes.data?.data?.accessToken;

  const headers = {
    'Content-Type': 'application/json',
    'Cookie': cookieHeader
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const regRes = await axios.get('http://localhost:5000/api/v1/payroll/process-register?cycleId=5&month=2026-09&companyId=all', { headers });

  console.log('\n=================================================================');
  console.log('LIVE PAYROLL CALCULATION ENGINE EXECUTION RESULT');
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
      console.log(`- Department: ${emp.department_name || 'N/A'}`);
      console.log(`- Designation: ${emp.designation_name || 'N/A'}`);
      console.log(`- Annual CTC: ₹${emp.annual_ctc}`);
      console.log(`- Attendance: ${emp.paid_days} Paid Days / ${emp.salary_days} Cycle Days (LOP: ${emp.unpaid_days})`);
      console.log(`- Gross Earned: ₹${emp.gross_earned}`);
      console.log(`- Total Deductions: ₹${emp.total_deductions}`);
      console.log(`- Net Take-Home Pay: ₹${emp.net_pay}`);
      console.log(`- Calculated Components Breakdown:`);
      console.log(emp.components);
    }
  }

  await conn.end();
}

syncOrg().catch(console.error);
