const jwt = require('jsonwebtoken');
const http = require('http');

const JWT_SECRET = process.env.JWT_SECRET || 'apponext_hrms_super_secret_jwt_key_2026';

const payload = {
  userId: 7,
  employeeId: 5,
  organizationId: 3,
  companyId: 5,
  role: 'organization_admin',
  roles: ['organization_admin'],
  email: 'ceo@apponext.com'
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

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

console.log('Sending request to /api/v1/payroll/process-register...');

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('HTTP Status Code:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('Success:', parsed.success);
      console.log('Message:', parsed.message || 'OK');
      if (parsed.data) {
        console.log('Summary:', parsed.data.summary);
        console.log('Component Definitions Count:', (parsed.data.component_definitions || []).length);
        console.log('Employees Processed Count:', (parsed.data.employees || []).length);
        if (parsed.data.employees && parsed.data.employees.length > 0) {
          console.log('\nSample Employee Payroll Result:');
          const emp0 = parsed.data.employees[0];
          console.log({
            id: emp0.id,
            name: emp0.name,
            employee_code: emp0.employee_code,
            annual_ctc: emp0.annual_ctc,
            gross_earned: emp0.gross_earned,
            total_deductions: emp0.total_deductions,
            net_pay: emp0.net_pay,
            paid_days: emp0.paid_days,
            components_calculated: Object.keys(emp0.components || {})
          });
        }
      } else {
        console.log('Response body:', parsed);
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
