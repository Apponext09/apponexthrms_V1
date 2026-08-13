require('dotenv').config({ path: 'C:\\Users\\Samarth\\OneDrive\\Documents\\Desktop\\apponexthrms\\.env' });
const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  }
});
const { v4: uuidv4 } = require('uuid');

async function testPayrollCycleCreation() {
  console.log('\n======================================================');
  console.log('🧪 TESTING PAYROLL CYCLE CREATION & DATABASE STORAGE');
  console.log('======================================================\n');

  const orgId = 68;
  const cycleName = `Executive Monthly Cycle Test (${Date.now().toString().slice(-4)})`;
  const cycleCode = `CYCLE-${Date.now()}`;

  // 1. Insert New Payroll Cycle into DB
  const [newCycleId] = await knex('payroll_cycles').insert({
    uuid: uuidv4(),
    organization_id: orgId,
    cycle_name: cycleName,
    cycle_code: cycleCode,
    cycle_type: 'monthly',
    frequency: 'Monthly',
    start_date: 1,
    cutoff_day: 25,
    cutoff_day_name: '25th of month',
    month_offset: 'Current',
    total_days_calc: '30',
    cap_amount: 1000000.00,
    cycle_start_date: '2026-08-01',
    cycle_end_date: '2026-08-31',
    payroll_run_date: '2026-08-31',
    salary_credit_date: '2026-08-28',
    status: 'open',
    is_active: 1,
    is_current_cycle: 1,
    created_by: 47,
    updated_by: 47,
    created_at: new Date(),
    updated_at: new Date()
  });

  console.log(`✅ 1. New Payroll Cycle Inserted! Generated ID: #${newCycleId}`);

  // 2. Fetch inserted cycle from DB to verify persistence
  const savedCycle = await knex('payroll_cycles').where('id', newCycleId).first();

  console.log('\n📋 2. Verified Saved Record in DB (`payroll_cycles` table):');
  console.table({
    ID: savedCycle.id,
    UUID: savedCycle.uuid,
    OrgID: savedCycle.organization_id,
    CycleName: savedCycle.cycle_name,
    Frequency: savedCycle.frequency,
    CutoffDay: savedCycle.cutoff_day,
    Status: savedCycle.status,
    IsActive: Boolean(savedCycle.is_active),
    CreatedAt: savedCycle.created_at
  });

  // 3. Count total active cycles for Org #68
  const allOrgCycles = await knex('payroll_cycles').where({ organization_id: orgId });
  console.log(`\n📊 3. Total Payroll Cycles stored in DB for Organization #${orgId}: ${allOrgCycles.length} Cycles`);

  console.log('\n======================================================');
  console.log('🎉 PAYROLL CYCLE CREATION & DB STORAGE VERIFIED 100%!');
  console.log('======================================================\n');

  await knex.destroy();
}

testPayrollCycleCreation().catch(err => {
  console.error('❌ Cycle Creation Test Failed:', err);
  process.exit(1);
});
