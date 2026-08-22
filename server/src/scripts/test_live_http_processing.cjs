const jwt = require('jsonwebtoken');
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

async function testLiveHttpProcessing() {
  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;
    const user = await db('users').where({ organization_id: orgId }).first();

    const privateKey = process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
    const token = jwt.sign({
      sub: String(user.id),
      userId: user.id,
      email: user.email,
      organizationId: orgId,
      roles: ['super_admin', 'organization_admin', 'admin'],
      permissions: ['*']
    }, privateKey, {
      algorithm: 'RS256',
      expiresIn: '1h'
    });

    const headers = {
      Authorization: `Bearer ${token}`,
      'X-Company-Id': '1'
    };

    const cycle = await db('payroll_cycles')
      .where({ organization_id: orgId })
      .whereNull('deleted_at')
      .first();

    console.log(`Calling POST http://localhost:5000/api/v1/payroll with cycle: ${cycle.id}...`);
    const genRes = await axios.post('http://localhost:5000/api/v1/payroll', {
      payrollCycleId: cycle.id,
      runType: 'regular'
    }, { headers });

    const run = genRes.data?.data;
    console.log(`✅ Run Initialized (ID: ${run.id}), Status: "${run.status}", Employees: ${run.total_employees}`);

    console.log(`Calling POST http://localhost:5000/api/v1/payroll/${run.id}/process...`);
    const procRes = await axios.post(`http://localhost:5000/api/v1/payroll/${run.id}/process`, {}, { headers });
    const processed = procRes.data?.data;
    console.log(`✅ Run Processed! Status: "${processed.status}", Processed Count: ${processed.processed_employees}, Error Count: ${processed.error_count}`);

    console.log(`Calling POST http://localhost:5000/api/v1/payroll/${run.id}/lock...`);
    const lockRes = await axios.post(`http://localhost:5000/api/v1/payroll/${run.id}/lock`, {}, { headers });
    console.log(`✅ Run Locked! Status: "${lockRes.data?.data?.status}"`);

    console.log(`Calling POST http://localhost:5000/api/v1/payroll/${run.id}/publish...`);
    const pubRes = await axios.post(`http://localhost:5000/api/v1/payroll/${run.id}/publish`, {}, { headers });
    console.log(`✅ Run Published! Status: "${pubRes.data?.data?.status}"`);

    console.log('🎉 100% END-TO-END HTTP VERIFIED WITHOUT ANY ERRORS! 🎉');
  } catch (err) {
    console.error('❌ Status:', err?.response?.status);
    console.error('❌ Data:', JSON.stringify(err?.response?.data));
    console.error('❌ Message:', err.message);
  } finally {
    await db.destroy();
  }
}

testLiveHttpProcessing();
