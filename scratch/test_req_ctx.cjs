const axios = require('axios');

async function testReqCtx() {
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

  // Test calling /payroll/cycles first
  const cyclesRes = await axios.get('http://localhost:5000/api/v1/payroll/cycles', { headers });
  console.log('Cycles API Result:', cyclesRes.data);

  // Test calling /payroll/components
  const compsRes = await axios.get('http://localhost:5000/api/v1/payroll/components', { headers });
  console.log('Components API Count:', (compsRes.data?.data || []).length);
}

testReqCtx().catch(console.error);
