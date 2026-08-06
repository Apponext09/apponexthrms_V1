import axios from 'axios';

const BASE = 'http://localhost:5000/api/v1';

async function run() {
  try {
    const tokenR = await axios.post(`${BASE}/auth/login`, { email: 'samarth@gmail.com', password: 'Admin@123' });
    const token = tokenR.data?.data?.accessToken;
    const api = axios.create({ baseURL: BASE, headers: { Authorization: `Bearer ${token}` } });

    const compsRes = await api.get('/payroll/components');
    console.log('--- LIVE PAYROLL COMPONENTS FROM API ---');
    console.log(JSON.stringify(compsRes.data?.data || compsRes.data, null, 2));

    const slabsRes = await api.get('/payroll/slabs');
    console.log('\n--- LIVE PAYROLL SLABS FROM API ---');
    console.log(JSON.stringify(slabsRes.data?.data || slabsRes.data, null, 2));
  } catch (err: any) {
    console.error('API Error:', err.response?.data || err.message);
  }
}

run();
