const axios = require('axios');

async function testFull() {
  const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', {
    email: 'abhishek@gmail.com',
    password: 'Admin@123'
  });

  const token = loginRes.data?.data?.token || loginRes.data?.token || loginRes.data?.data?.accessToken;
  const cookies = loginRes.headers['set-cookie'];
  const cookieHeader = Array.isArray(cookies) ? cookies.map(c => c.split(';')[0]).join('; ') : cookies;

  console.log('Login token acquired. Requesting process-register...');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Cookie': cookieHeader
  };

  const res = await axios.get('http://localhost:5000/api/v1/payroll/process-register?cycleId=5&month=2026-09', { headers });

  console.log('\n=== LIVE PAYROLL PROCESSING REGISTER API RESULT ===');
  console.log('HTTP Status:', res.status);
  console.log('Success:', res.data.success);
  console.log('Cycle Name:', res.data.data?.cycle?.cycle_name || 'Monthly');
  console.log('Dynamic Component Definitions:', (res.data.data?.component_definitions || []).map(c => c.name));
  console.log('Employees Processed Count:', (res.data.data?.employees || []).length);

  if (res.data.data?.employees?.length > 0) {
    for (const emp of res.data.data.employees) {
      console.log(`\nEmployee #${emp.id}: ${emp.name} (${emp.employee_code})`);
      console.log(`  Annual CTC: ₹${emp.annual_ctc}`);
      console.log(`  Paid Days: ${emp.paid_days} / ${emp.salary_days}`);
      console.log(`  Gross Earned: ₹${emp.gross_earned}`);
      console.log(`  Total Deductions: ₹${emp.total_deductions}`);
      console.log(`  Net Take-Home Pay: ₹${emp.net_pay}`);
      console.log(`  Calculated Components:`, emp.components);
    }
  }
}

testFull().catch(console.error);
