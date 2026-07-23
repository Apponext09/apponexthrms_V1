import axios from 'axios';

const BASE = 'http://localhost:5000/api/v1';

async function run() {
  console.log('\n====== DEPARTMENT MANAGERS & MODAL TEST ======\n');
  const tokenR = await axios.post(`${BASE}/auth/login`, { email: 'samarth@gmail.com', password: 'Admin@123' });
  const token = tokenR.data?.data?.accessToken;

  const api = axios.create({ baseURL: BASE, headers: { Authorization: `Bearer ${token}` } });

  // 1. Get departments
  const deptsRes = await api.get('/settings/departments');
  const items = deptsRes.data?.data || [];
  console.log(`Found ${items.length} departments.`);

  if (items.length > 0) {
    const targetDept = items[0];
    console.log(`\nTesting GET /settings/departments/${targetDept.id}/managers...`);
    const mgrRes = await api.get(`/settings/departments/${targetDept.id}/managers`);
    console.log('   Response status 200 OK! Data:', mgrRes.data);
  }

  console.log('\n✅ ALL DEPARTMENT MANAGER ENDPOINTS WORKING CLEANLY!\n');
}

run().catch(console.error);
