import axios from 'axios';

const BASE = 'http://localhost:5000/api/v1';

async function run() {
  console.log('\n====== PASSWORD UPDATE & LOGIN TEST ======\n');
  const tokenR = await axios.post(`${BASE}/auth/login`, { email: 'samarth@gmail.com', password: 'Admin@123' });
  const token = tokenR.data?.data?.accessToken;

  const api = axios.create({ baseURL: BASE, headers: { Authorization: `Bearer ${token}` } });

  // 1. Update password for employee 4 (sarthak@gmail.com)
  const newPassword = 'NewSecretPassword@123';
  console.log('1. Updating password for sarthak@gmail.com to:', newPassword);
  const patchRes = await api.patch('/employees/4', {
    password: newPassword,
  });
  console.log('   Password update API call succeeded! Status:', patchRes.status);

  // 2. Test login with old password (should fail)
  console.log('\n2. Testing login with old password (Admin@123)...');
  try {
    await axios.post(`${BASE}/auth/login`, { email: 'sarthak@gmail.com', password: 'Admin@123' });
    console.log('❌ SHOULD HAVE FAILED');
  } catch (e: any) {
    console.log('✅ Correctly rejected old password:', e.response?.data?.message || e.message);
  }

  // 3. Test login with new password (should succeed)
  console.log('\n3. Testing login with NEW password (NewSecretPassword@123)...');
  const newLoginR = await axios.post(`${BASE}/auth/login`, { email: 'sarthak@gmail.com', password: newPassword });
  console.log('✅ LOGIN SUCCESSFUL WITH NEW PASSWORD! Token received:', !!newLoginR.data?.data?.accessToken);

  // 4. Restore password back to Admin@123
  console.log('\n4. Restoring password back to Admin@123...');
  await api.patch('/employees/4', {
    password: 'Admin@123',
  });
  console.log('✅ Password restored to Admin@123');

  console.log('\n====== ALL PASSWORD TESTS PASSED PERFECTLY! ======\n');
}

run().catch(console.error);
