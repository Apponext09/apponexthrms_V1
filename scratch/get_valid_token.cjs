require('dotenv').config({ path: './server/.env' });
const http = require('http');

const { generateAccessToken } = require('./server/dist/common/lib/jwt');

const token = generateAccessToken({
  userId: 7,
  employeeId: 5,
  organizationId: 3,
  companyId: 5,
  role: 'organization_admin',
  roles: ['organization_admin'],
  email: 'ceo@apponext.com'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/payroll/process-register?cycleId=5&payrollMonth=2026-09',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Company-Id': '5',
    'Content-Type': 'application/json'
  }
};

console.log('Sending request with RS256 token from dist...');

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('HTTP Status Code:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('Success:', parsed.success);
      if (parsed.data) {
        console.log('\n=== PAYROLL REGISTER API TEST SUCCESSFUL ===');
        console.log('Cycle Name:', parsed.data.cycle?.cycle_name || 'Monthly');
        console.log('Component Definitions Count:', (parsed.data.component_definitions || []).length);
        console.log('Employees Processed Count:', (parsed.data.employees || []).length);
        if (parsed.data.employees && parsed.data.employees.length > 0) {
          console.log('\nCalculated Employee Payroll Register Results:');
          for (const emp of parsed.data.employees) {
            console.log({
              id: emp.id,
              name: emp.name,
              code: emp.employee_code,
              annual_ctc: emp.annual_ctc,
              gross_earned: emp.gross_earned,
              total_deductions: emp.total_deductions,
              net_pay: emp.net_pay,
              paid_days: emp.paid_days,
              components: emp.components
            });
          }
        }
      } else {
        console.log('Response:', parsed);
      }
    } catch (err) {
      console.log('Raw Output:', data.slice(0, 500));
    }
  });
});

req.on('error', err => {
  console.error('Request Error:', err.message);
});

req.end();
