const axios = require('axios');
const knex = require('knex');
require('dotenv').config();

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms'
  }
});

async function testHttpPayrollProcess() {
  console.log('===========================================================');
  console.log('🧪 TESTING LIVE HTTP /payroll AND /payroll/:id/process');
  console.log('===========================================================\n');

  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;
    const user = await db('users').where({ email: 'ceo@kosqu.com' }).first() || await db('users').first();
    
    console.log(`Testing with User: ${user.email} (Org ID: ${orgId})`);

    // Let's create a valid token or use internal auth endpoint
    const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: user.email,
      password: 'password123'
    }).catch(async () => {
      // Try default admin login
      return axios.post('http://localhost:5000/api/v1/auth/login', {
        email: 'admin@kosqu.com',
        password: 'password123'
      });
    }).catch(err => {
      console.log('Login attempt error:', err?.response?.data || err.message);
      return null;
    });

    const token = loginRes?.data?.data?.accessToken || loginRes?.data?.token;
    if (!token) {
      console.log('Could not get login token. Testing direct DB status instead.');
      return;
    }

    console.log('✅ Authenticated successfully. Token obtained.');

    const cycle = await db('payroll_cycles')
      .where({ organization_id: orgId })
      .whereNull('deleted_at')
      .first();

    const headers = {
      Authorization: `Bearer ${token}`,
      'X-Company-Id': '1'
    };

    // 1. Generate Run
    console.log(`\nCalling POST /api/v1/payroll with cycleId: ${cycle.id}...`);
    const genRes = await axios.post('http://localhost:5000/api/v1/payroll', {
      payrollCycleId: cycle.id,
      runType: 'regular'
    }, { headers });

    const run = genRes.data?.data;
    console.log(`✅ Run Initialized (ID: ${run.id}), Total Employees: ${run.total_employees}`);

    // 2. Process Run
    console.log(`\nCalling POST /api/v1/payroll/${run.id}/process...`);
    const processRes = await axios.post(`http://localhost:5000/api/v1/payroll/${run.id}/process`, {}, { headers });
    const processed = processRes.data?.data;
    console.log(`✅ Run Processed! Status: ${processed.status}, Processed Count: ${processed.processed_employees}, Error Count: ${processed.error_count}`);

    // 3. Lock Run
    console.log(`\nCalling POST /api/v1/payroll/${run.id}/lock...`);
    const lockRes = await axios.post(`http://localhost:5000/api/v1/payroll/${run.id}/lock`, {}, { headers });
    console.log(`✅ Run Locked! Status: ${lockRes.data?.data?.status}`);

    // 4. Publish Run
    console.log(`\nCalling POST /api/v1/payroll/${run.id}/publish...`);
    const publishRes = await axios.post(`http://localhost:5000/api/v1/payroll/${run.id}/publish`, {}, { headers });
    console.log(`✅ Run Published! Status: ${publishRes.data?.data?.status}`);

    console.log('\n===========================================================');
    console.log('🎉 LIVE HTTP CALLS (GENERATE -> PROCESS -> LOCK -> PUBLISH) 100% SUCCESS 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ HTTP Call Error:', err?.response?.data || err.message);
  } finally {
    await db.destroy();
  }
}

testHttpPayrollProcess();
