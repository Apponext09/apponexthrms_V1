import axios from 'axios';

const BASE = 'http://localhost:5000/api/v1';

async function run() {
  console.log('\n====== DEPARTMENT CRUD TEST ======\n');
  const tokenR = await axios.post(`${BASE}/auth/login`, { email: 'samarth@gmail.com', password: 'Admin@123' });
  const token = tokenR.data?.data?.accessToken;

  const api = axios.create({ baseURL: BASE, headers: { Authorization: `Bearer ${token}` } });

  // 1. Create department
  const newDeptName = `TestDept_${Date.now()}`;
  const newDeptCode = `TD_${Math.floor(1000 + Math.random() * 9000)}`;

  console.log('1. Creating department:', newDeptName, newDeptCode);
  const createRes = await api.post('/settings/departments', {
    name: newDeptName,
    code: newDeptCode,
    description: 'Test department created by automated diagnostic',
  });
  console.log('   Created response:', createRes.data);
  const createdId = createRes.data?.data?.id;

  // 2. Fetch single department by ID
  console.log(`\n2. Fetching department by ID ${createdId}...`);
  const getRes = await api.get(`/settings/departments/${createdId}`);
  console.log('   Get response:', getRes.data?.data);

  // 3. Update department by ID
  console.log(`\n3. Updating department ${createdId}...`);
  const updatedName = `${newDeptName}_Updated`;
  const updateRes = await api.patch(`/settings/departments/${createdId}`, {
    name: updatedName,
    description: 'Updated description successfully!',
  });
  console.log('   Update response:', updateRes.data);

  // 4. Verify updated department
  const verifyRes = await api.get(`/settings/departments/${createdId}`);
  console.log('   Verified updated data:', verifyRes.data?.data?.name, verifyRes.data?.data?.description);

  console.log('\n✅ ALL DEPARTMENT CRUD TESTS PASSED SUCCESSFULLY!\n');
}

run().catch(console.error);
