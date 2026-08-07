require('dotenv').config({ path: './server/.env' });
const port = process.env.PORT || 5000;

async function testFetchAllUserBreakLogs() {
  const users = ['yash@kosqu.com', 'abhishek@gmail.com', 'admin@apponext.com', 'harsh@gmail.com'];
  
  for (const email of users) {
    try {
      const loginRes = await fetch(`http://localhost:${port}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: email.includes('admin') || email.includes('abhishek') || email.includes('harsh') ? 'Password@123' : 'password123' }),
      });
      const loginData = await loginRes.json();
      const token = loginData.data?.accessToken;
      if (!token) {
        console.log(`User ${email} login failed:`, loginData.message);
        continue;
      }

      const res = await fetch(`http://localhost:${port}/api/v1/attendance/break-logs?startDate=2026-07-01&endDate=2026-08-31`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      console.log(`User ${email} break logs count:`, data.data?.length, 'Success:', data.success);
    } catch (e) {
      console.error(`User ${email} test error:`, e.message);
    }
  }
}

testFetchAllUserBreakLogs().catch(console.error);
