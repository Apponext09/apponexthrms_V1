require('dotenv').config({ path: './server/.env' });
const port = process.env.PORT || 5000;

async function testFetchBreaks() {
  console.log('--- TESTING GET /settings/breaks ---');

  // 1. Login as employee yash@kosqu.com
  const loginRes = await fetch(`http://localhost:${port}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'yash@kosqu.com', password: 'password123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken;
  console.log('Login token received:', !!token);

  // 2. Call /settings/breaks
  const breaksRes = await fetch(`http://localhost:${port}/api/v1/settings/breaks?is_active=Yes&pageSize=100`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log('Status code:', breaksRes.status);
  const breaksData = await breaksRes.json();
  console.log('Response data:', JSON.stringify(breaksData, null, 2));
}

testFetchBreaks().catch(console.error);
