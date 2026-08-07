require('dotenv').config({ path: './server/.env' });
const port = process.env.PORT || 5000;

async function testFetchBreaksWithCompanyFilter() {
  console.log('--- TESTING GET /attendance/break-logs WITH COMPANY FILTER ---');

  const loginRes = await fetch(`http://localhost:${port}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'yash@kosqu.com', password: 'password123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken;

  // 1. Without filter
  const allRes = await fetch(`http://localhost:${port}/api/v1/attendance/break-logs?startDate=2026-07-01&endDate=2026-08-31`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const allData = await allRes.json();
  console.log('All break logs count:', allData.data?.length);

  // 2. With companyId=4 (Kosqu)
  const kosquRes = await fetch(`http://localhost:${port}/api/v1/attendance/break-logs?startDate=2026-07-01&endDate=2026-08-31&companyId=4`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const kosquData = await kosquRes.json();
  console.log('Kosqu (companyId=4) break logs count:', kosquData.data?.length);
  console.log('Sample record:', kosquData.data?.[0]);
}

testFetchBreaksWithCompanyFilter().catch(console.error);
