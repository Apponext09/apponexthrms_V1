require('dotenv').config({ path: './server/.env' });
const port = process.env.PORT || 5000;

async function testAllFilters() {
  console.log('--- TESTING ALL REPORT FILTERS ONE BY ONE ---');

  const loginRes = await fetch(`http://localhost:${port}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'yash@kosqu.com', password: 'password123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken;

  const baseUrl = `http://localhost:${port}/api/v1/attendance/break-logs?startDate=2026-07-01&endDate=2026-08-31`;

  // 1. Base (No filter)
  const baseRes = await fetch(baseUrl, { headers: { 'Authorization': `Bearer ${token}` } });
  const baseData = await baseRes.json();
  console.log('Base records count:', baseData.data?.length);

  if (baseData.data && baseData.data.length > 0) {
    const sample = baseData.data[0];
    console.log('Sample record fields:', {
      employeeId: sample.employeeId,
      employeeName: sample.employeeName,
      companyId: sample.companyId,
      currentLocationId: sample.currentLocationId,
      currentDepartmentId: sample.currentDepartmentId,
      reportingManagerId: sample.reportingManagerId,
      breakTypeName: sample.breakTypeName,
    });

    // Test Company filter
    if (sample.companyId) {
      const compRes = await fetch(`${baseUrl}&companyId=${sample.companyId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const compData = await compRes.json();
      console.log(`Company filter (${sample.companyId}) count:`, compData.data?.length);
    }

    // Test Department filter
    if (sample.currentDepartmentId) {
      const deptRes = await fetch(`${baseUrl}&departmentId=${sample.currentDepartmentId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const deptData = await deptRes.json();
      console.log(`Department filter (${sample.currentDepartmentId}) count:`, deptData.data?.length);
    }

    // Test Reporting Manager filter
    if (sample.reportingManagerId) {
      const mgrRes = await fetch(`${baseUrl}&reportingManagerId=${sample.reportingManagerId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const mgrData = await mgrRes.json();
      console.log(`Reporting Manager filter (${sample.reportingManagerId}) count:`, mgrData.data?.length);
    }

    // Test Employee filter
    if (sample.employeeId) {
      const empRes = await fetch(`${baseUrl}&employeeId=${sample.employeeId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const empData = await empRes.json();
      console.log(`Employee filter (${sample.employeeId}) count:`, empData.data?.length);
    }

    // Test Location filter
    if (sample.currentLocationId) {
      const locRes = await fetch(`${baseUrl}&locationId=${sample.currentLocationId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const locData = await locRes.json();
      console.log(`Location filter (${sample.currentLocationId}) count:`, locData.data?.length);
    } else {
      console.log('Sample record has currentLocationId = null. Checking all employees work locations...');
    }
  }
}

testAllFilters().catch(console.error);
