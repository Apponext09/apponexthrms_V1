require('dotenv').config({ path: './server/.env' });
const port = process.env.PORT || 5000;

async function testFetchMasterData() {
  console.log('--- TESTING MASTER DATA ENDPOINTS FOR REPORT FILTERS ---');

  const loginRes = await fetch(`http://localhost:${port}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'yash@kosqu.com', password: 'password123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken;

  // Companies
  const compRes = await fetch(`http://localhost:${port}/api/v1/settings/companies?pageSize=100`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const compData = await compRes.json();
  console.log('Companies count:', compData.data?.length || compData.data?.items?.length || 0);

  // Locations
  const locRes = await fetch(`http://localhost:${port}/api/v1/settings/locations?pageSize=100`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const locData = await locRes.json();
  console.log('Locations count:', locData.data?.length || locData.data?.items?.length || 0);

  // Departments
  const deptRes = await fetch(`http://localhost:${port}/api/v1/settings/departments?pageSize=100`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const deptData = await deptRes.json();
  console.log('Departments count:', deptData.data?.length || deptData.data?.items?.length || 0);

  // Employees
  const empRes = await fetch(`http://localhost:${port}/api/v1/employees?pageSize=200`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const empData = await empRes.json();
  console.log('Employees count:', empData.data?.length || empData.data?.items?.length || 0);
}

testFetchMasterData().catch(console.error);
