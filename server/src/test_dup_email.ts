import axios from 'axios';

const BASE = 'http://localhost:5000/api/v1';

async function run() {
  console.log('\n====== DUPLICATE EMAIL TEST ======\n');
  const tokenR = await axios.post(`${BASE}/auth/login`, { email: 'samarth@gmail.com', password: 'Admin@123' });
  const token = tokenR.data?.data?.accessToken;

  const api = axios.create({ baseURL: BASE, headers: { Authorization: `Bearer ${token}` } });

  try {
    console.log('Testing duplicate employee creation with samarth@gmail.com...');
    await api.post('/employees', {
      employeeCode: `TESTDUP_${Date.now()}`,
      firstName: 'Duplicate',
      lastName: 'User',
      email: 'samarth@gmail.com', // Already exists!
      dateOfJoining: '2026-07-23',
      employmentType: 'full_time',
      password: 'Admin@123',
    });
    console.log('❌ SHOULD HAVE FAILED');
  } catch (e: any) {
    console.log(`✅ CAUGHT EXPECTED ERROR (${e.response?.status}):`);
    console.log('   Message:', e.response?.data?.message || e.response?.data?.error?.message);
  }
}

run().catch(console.error);
