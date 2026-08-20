const knex = require('knex');
const { PayrollService } = require('../modules/payroll/services/PayrollService');
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

async function testUIProcessPayrollCall() {
  console.log('===========================================================');
  console.log('🧪 TESTING EXACT UI PROCESS PAYROLL CALL FLOW');
  console.log('===========================================================\n');

  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;
    const user = await db('users').first();
    const validUserId = user ? user.id : 10;

    const ctx = {
      organizationId: orgId,
      userId: validUserId,
      roles: ['admin']
    };

    const cycle = await db('payroll_cycles')
      .where({ organization_id: orgId })
      .whereNull('deleted_at')
      .first();

    const service = new PayrollService();

    console.log(`Calling generatePayroll with cycleId: ${cycle.id}...`);
    const generatedRun = await service.generatePayroll(ctx, cycle.id, 'regular', {});
    console.log('✅ Generated Run:', generatedRun);

    console.log(`\nCalling processPayroll with runId: ${generatedRun.id}...`);
    const processedRun = await service.processPayroll(ctx, generatedRun.id);
    console.log('✅ Processed Run:', processedRun);

    console.log(`\nCalling lockPayroll with runId: ${generatedRun.id}...`);
    const lockedRun = await service.lockPayroll(ctx, generatedRun.id);
    console.log('✅ Locked Run:', lockedRun);

    console.log(`\nCalling publishPayroll with runId: ${generatedRun.id}...`);
    const publishedRun = await service.publishPayroll(ctx, generatedRun.id);
    console.log('✅ Published Run:', publishedRun);

    console.log('\n===========================================================');
    console.log('🎉 ALL 4 SERVICE CALLS EXECUTED WITH ZERO ERRORS 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ Service Call Error:', err);
  } finally {
    await db.destroy();
  }
}

testUIProcessPayrollCall();
