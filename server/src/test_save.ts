/**
 * Live diagnostic: tests create + update employee via the live API
 * Run: npx tsx src/test_save.ts
 */
import axios from 'axios';

const BASE = 'http://localhost:5000/api/v1';

async function getToken(email: string, password: string) {
  const r = await axios.post(`${BASE}/auth/login`, { email, password });
  return r.data?.data?.accessToken as string;
}

async function run() {
  console.log('\n====== EMPLOYEE SAVE DIAGNOSTIC ======\n');

  // ── 1. Login as org admin
  let token: string;
  try {
    token = await getToken('samarth@gmail.com', 'Admin@123');
    console.log('✅ Login OK — samarth@gmail.com');
  } catch (e: any) {
    console.error('❌ Login FAILED:', e.response?.data || e.message);
    return;
  }

  const api = axios.create({
    baseURL: BASE,
    headers: { Authorization: `Bearer ${token}` },
  });

  // ── 2. List employees (check existing)
  try {
    const r = await api.get('/employees?pageSize=5');
    const emps = r.data?.data || [];
    console.log(`\n✅ GET /employees → ${emps.length} employees found`);
    if (emps.length > 0) {
      const first = emps[0];
      console.log(`   Sample: [${first.id}] ${first.firstName} ${first.lastName} | dept: ${first.department || 'none'} | designation: ${first.designation || 'none'}`);
    }
  } catch (e: any) {
    console.error('❌ GET /employees FAILED:', e.response?.data || e.message);
  }

  // ── 3. Try CREATE employee (minimal payload)
  const testCode = `TEST${Date.now()}`;
  let createdId: number | null = null;
  try {
    const payload = {
      employeeCode: testCode,
      firstName: 'Test',
      lastName: 'DiagUser',
      email: `testdiag_${Date.now()}@apponext.com`,
      dateOfJoining: '2024-01-15',
      employmentType: 'full_time',
      password: 'Admin@123',
    };
    const r = await api.post('/employees', payload);
    createdId = r.data?.data?.employee?.id || r.data?.data?.id;
    console.log(`\n✅ POST /employees → Created ID: ${createdId}`);
  } catch (e: any) {
    const errData = e.response?.data;
    console.error('\n❌ POST /employees FAILED:');
    console.error('   Status:', e.response?.status);
    console.error('   Error:', JSON.stringify(errData, null, 2));
  }

  // ── 4. Try CREATE with department + job title
  let createdId2: number | null = null;
  try {
    // get departments first
    const depts = await api.get('/settings/departments?pageSize=10');
    const dept = (depts.data?.data || [])[0];
    if (dept) {
      const payload = {
        employeeCode: `TEST2${Date.now()}`,
        firstName: 'Test2',
        lastName: 'DiagDept',
        email: `testdiag2_${Date.now()}@apponext.com`,
        dateOfJoining: '2024-02-01',
        employmentType: 'full_time',
        password: 'Admin@123',
        departmentId: dept.id,
        jobTitle: 'Software Engineer',
      };
      const r = await api.post('/employees', payload);
      createdId2 = r.data?.data?.employee?.id || r.data?.data?.id;
      console.log(`✅ POST /employees (with dept "${dept.name}" + jobTitle) → Created ID: ${createdId2}`);
    } else {
      console.log('⚠️  No departments found, skipping dept+title test');
    }
  } catch (e: any) {
    const errData = e.response?.data;
    console.error('\n❌ POST /employees (with dept+jobTitle) FAILED:');
    console.error('   Status:', e.response?.status);
    console.error('   Error:', JSON.stringify(errData, null, 2));
  }

  // ── 5. Try UPDATE the first created employee
  if (createdId) {
    try {
      const r = await api.patch(`/employees/${createdId}`, {
        firstName: 'TestUpdated',
        mobile: '9876543210',
      });
      console.log(`\n✅ PATCH /employees/${createdId} → Updated OK`);
    } catch (e: any) {
      const errData = e.response?.data;
      console.error(`\n❌ PATCH /employees/${createdId} FAILED:`);
      console.error('   Status:', e.response?.status);
      console.error('   Error:', JSON.stringify(errData, null, 2));
    }
  }

  // ── 6. Login as m@gmail.com (employee+dept_head) and try update
  try {
    const mToken = await getToken('m@gmail.com', 'Admin@123');
    console.log('\n✅ Login OK — m@gmail.com');
    const mApi = axios.create({ baseURL: BASE, headers: { Authorization: `Bearer ${mToken}` } });
    const emps = await mApi.get('/employees?pageSize=3');
    console.log(`   Can fetch ${emps.data?.data?.length || 0} employees`);
  } catch (e: any) {
    console.error('❌ Login/fetch as m@gmail.com FAILED:', e.response?.data || e.message);
  }

  console.log('\n====== DIAGNOSTIC COMPLETE ======\n');
}

run().catch(console.error);
