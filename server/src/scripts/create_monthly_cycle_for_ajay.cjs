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

async function createMonthlyCycleForAjay() {
  console.log('\n======================================================');
  console.log('🚀 CREATING MONTHLY PAYROLL CYCLE FOR ajay@gmail.com');
  console.log('======================================================\n');

  // 1. Find user ajay@gmail.com
  const user = await knex('users').where({ email: 'ajay@gmail.com' }).first();
  if (!user) {
    console.error('❌ User ajay@gmail.com not found!');
    process.exit(1);
  }

  const orgId = user.organization_id || 68;
  const userId = user.id;

  console.log(`👤 Found User: ajay@gmail.com (User ID: #${userId}, Org ID: #${orgId})`);

  // 2. Check if a cycle named "Monthly" already exists for this org
  let existingCycle = await knex('payroll_cycles')
    .where({ organization_id: orgId, cycle_name: 'Monthly' })
    .whereNull('deleted_at')
    .first();

  if (!existingCycle) {
    existingCycle = await knex('payroll_cycles')
      .where({ organization_id: orgId, name: 'Monthly' })
      .whereNull('deleted_at')
      .first();
  }

  let cycleId;
  if (existingCycle) {
    console.log(`ℹ️ "Monthly" Payroll Cycle already exists with ID #${existingCycle.id}. Updating to active & open status...`);
    await knex('payroll_cycles').where('id', existingCycle.id).update({
      status: 'open',
      is_active: 1,
      is_current_cycle: 1,
      frequency: 'Monthly',
      cutoff_day: 25,
      salary_credit_date: '2026-08-28',
      updated_at: new Date()
    });
    cycleId = existingCycle.id;
  } else {
    // Insert new cycle
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const [insertedId] = await knex('payroll_cycles').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      cycle_name: 'Monthly',
      cycle_code: `CYCLE-MONTHLY-${Date.now()}`,
      cycle_type: 'monthly',
      frequency: 'Monthly',
      start_date: 1,
      cutoff_day: 25,
      cutoff_day_name: '25th of month',
      month_offset: 'Current',
      total_days_calc: '30',
      cap_amount: 1000000.00,
      cycle_start_date: firstDay,
      cycle_end_date: lastDay,
      payroll_run_date: lastDay,
      salary_credit_date: `${year}-${String(month + 1).padStart(2, '0')}-28`,
      status: 'open',
      is_active: 1,
      is_current_cycle: 1,
      created_by: userId,
      updated_by: userId,
      created_at: new Date(),
      updated_at: new Date()
    });
    cycleId = insertedId;
    console.log(`✨ Created brand new "Monthly" Payroll Cycle with ID #${cycleId}`);
  }

  // 3. Fetch final record from DB
  const cycleRecord = await knex('payroll_cycles').where('id', cycleId).first();

  console.log('\n📄 Final DB Record in `payroll_cycles`:');
  console.table({
    ID: cycleRecord.id,
    Name: cycleRecord.cycle_name || cycleRecord.name,
    OrgID: cycleRecord.organization_id,
    Frequency: cycleRecord.frequency,
    CutoffDay: cycleRecord.cutoff_day,
    Status: cycleRecord.status,
    IsActive: Boolean(cycleRecord.is_active),
    IsCurrentCycle: Boolean(cycleRecord.is_current_cycle),
    CreatedAt: cycleRecord.created_at
  });

  // 4. Ensure Slabs are linked to this cycle ID
  await knex('payroll_slabs')
    .where({ organization_id: orgId })
    .whereNull('cycle_id')
    .update({ cycle_id: cycleId });

  const linkedSlabs = await knex('payroll_slabs').where({ organization_id: orgId, cycle_id: cycleId });
  console.log(`\n🏷️ Linked Slabs Count for this "Monthly" Cycle: ${linkedSlabs.length} Slabs`);
  if (linkedSlabs.length > 0) {
    console.table(linkedSlabs.map(s => ({ id: s.id, name: s.name, cycle_id: s.cycle_id })));
  }

  console.log('\n======================================================');
  console.log('🎉 "MONTHLY" PAYROLL CYCLE CREATED & LINKED SUCCESSFULLY!');
  console.log('======================================================\n');

  await knex.destroy();
}

createMonthlyCycleForAjay().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
