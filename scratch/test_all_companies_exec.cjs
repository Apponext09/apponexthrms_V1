const axios = require('axios');

async function testAllCompanies() {
  try {
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

    console.log('Sending GET /payroll/process-register?cycleId=5&month=2026-09&companyId=ALL with X-Company-Id: 5...');
    const regRes = await axios.get('http://localhost:5000/api/v1/payroll/process-register?cycleId=5&month=2026-09&companyId=ALL', { headers });

    console.log('\n=================================================================');
    console.log('LIVE END-TO-END PAYROLL CALCULATION ENGINE EXECUTION SUCCESSFUL!');
    console.log('=================================================================');
    console.log('API Status:', regRes.status);
    console.log('Success:', regRes.data.success);
    console.log('Cycle Name:', regRes.data.data?.cycle?.cycle_name || 'Monthly');
    console.log('Total Dynamic Component Definitions:', (regRes.data.data?.component_definitions || []).length);
    console.log('Total Employees Processed:', (regRes.data.data?.employees || []).length);

    if (regRes.data.data?.employees?.length > 0) {
      for (const emp of regRes.data.data.employees) {
        console.log(`\n-------------------------------------------------------------`);
        console.log(`Employee: ${emp.name} (${emp.employee_code})`);
        console.log(`- Department: ${emp.department_name || 'General'}`);
        console.log(`- Designation: ${emp.designation_name || 'Staff'}`);
        console.log(`- Annual CTC: ₹${emp.annual_ctc}`);
        console.log(`- Attendance: ${emp.paid_days} Paid Days / ${emp.salary_days} Cycle Days (LOP: ${emp.unpaid_days})`);
        console.log(`- Gross Earned: ₹${emp.gross_earned}`);
        console.log(`- Total Deductions: ₹${emp.total_deductions}`);
        console.log(`- Net Take-Home Pay: ₹${emp.net_pay}`);
        console.log(`- Dynamic Components Calculated:`);
        console.log(emp.components);
      }
    }
  } catch (err) {
    console.error('API Test Error:', err.response?.data || err.message);
  }
}

testAllCompanies().catch(console.error);
