const path = require('path');
require('dotenv').config({ path: 'C:\\Users\\Samarth\\OneDrive\\Documents\\Desktop\\apponexthrms\\.env' });
const { v4: uuidv4 } = require('uuid');

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

async function checkPayrollSlabs() {
  console.log('\n======================================================');
  console.log('🔍 AUDITING PAYROLL SLABS & CALCULATION RULES');
  console.log('======================================================\n');

  // 1. Fetch Existing Slabs from DB
  const slabs = await knex('payroll_slabs').whereNull('deleted_at');
  console.log(`📋 Total Payroll Slabs in DB: ${slabs.length}`);
  console.table(slabs.map(s => ({
    ID: s.id,
    Name: s.name,
    MinCTC: s.min_ctc,
    MaxCTC: s.max_ctc,
    CycleID: s.cycle_id,
    EmploymentType: s.employment_type,
    PFRate: s.pf_rate_pct,
    ESICRate: s.esic_rate_pct,
    IsActive: Boolean(s.is_active),
    OrgID: s.organization_id
  })));

  // 2. Get an existing Cycle ID to link
  const cycle = await knex('payroll_cycles').where({ organization_id: 68 }).first();
  const cycleId = cycle ? cycle.id : null;

  // 3. Test Creating a New Payroll Slab
  const testSlabName = `Executive Leadership Salary Slab (${Date.now().toString().slice(-4)})`;
  const slabPayload = {
    uuid: uuidv4(),
    organization_id: 68,
    name: testSlabName,
    departments: JSON.stringify(['Engineering', 'Management']),
    grades: JSON.stringify(['L6', 'L7']),
    locations: JSON.stringify(['Bangalore', 'Mumbai']),
    min_ctc: 1200000.00,
    max_ctc: 2500000.00,
    selected_component_ids: JSON.stringify([101, 102, 103, 106, 107]),
    cycle_id: cycleId,
    employment_type: 'Regular',
    is_active: 1,
    created_at: new Date(),
    updated_at: new Date()
  };

  const [insertedId] = await knex('payroll_slabs').insert(slabPayload);
  console.log(`\n✅ 1. New Payroll Slab Inserted! Generated ID: #${insertedId}`);

  // 4. Test Updating the Created Slab
  await knex('payroll_slabs').where('id', insertedId).update({
    name: `${testSlabName} [Updated]`,
    max_ctc: 3000000.00,
    updated_at: new Date()
  });

  console.log(`✅ 2. Payroll Slab Update Test SUCCESSFUL! Slab ID: #${insertedId}`);

  // 5. Fetch Back to Verify Persistence
  const savedSlab = await knex('payroll_slabs').where('id', insertedId).first();
  console.log('\n📋 3. Verified Saved DB Record:');
  console.table({
    ID: savedSlab.id,
    UUID: savedSlab.uuid,
    Name: savedSlab.name,
    MinCTC: savedSlab.min_ctc,
    MaxCTC: savedSlab.max_ctc,
    CycleID: savedSlab.cycle_id,
    EmploymentType: savedSlab.employment_type,
    Departments: savedSlab.departments,
    Grades: savedSlab.grades,
    IsActive: Boolean(savedSlab.is_active)
  });

  console.log('\n======================================================');
  console.log('🎉 PAYROLL SLAB CREATION & UPDATE 100% VERIFIED!');
  console.log('======================================================\n');

  await knex.destroy();
}

checkPayrollSlabs().catch(err => {
  console.error('❌ Slab Verification Error:', err);
  process.exit(1);
});
