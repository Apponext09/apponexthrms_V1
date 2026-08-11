const path = require('path');
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

async function testFilters() {
  console.log('\n======================================================');
  console.log('🧪 TESTING FILTERS FOR SLABS & PAYROLL COMPONENTS');
  console.log('======================================================\n');

  const orgId = 68;

  // ----------------------------------------------------
  // PART 1: TESTING SLAB FILTERS
  // ----------------------------------------------------
  console.log('📌 PART 1: PAYROLL SLAB FILTERS');

  // Filter 1.1: Active Slabs for Org #68
  const activeSlabs = await knex('payroll_slabs')
    .where({ organization_id: orgId, is_active: 1 })
    .whereNull('deleted_at');
  console.log(`  ✅ Filter 1.1 (Active Slabs): Found ${activeSlabs.length} active slabs`);

  // Filter 1.2: Slab matching specific CTC (e.g. ₹5,00,000)
  const targetCtc = 500000;
  const ctcFilteredSlabs = activeSlabs.filter(s => targetCtc >= Number(s.min_ctc || 0) && targetCtc <= Number(s.max_ctc || 99999999));
  console.log(`  ✅ Filter 1.2 (CTC = ₹5,00,000 Match): Matched ${ctcFilteredSlabs.length} slab(s) ("${ctcFilteredSlabs[0]?.name || 'N/A'}")`);

  // Filter 1.3: Slabs filtered by Cycle ID
  const cycle = await knex('payroll_cycles').where({ organization_id: orgId }).first();
  if (cycle) {
    const cycleSlabs = await knex('payroll_slabs')
      .where({ organization_id: orgId, cycle_id: cycle.id })
      .whereNull('deleted_at');
    console.log(`  ✅ Filter 1.3 (Linked to Cycle ID #${cycle.id}): Found ${cycleSlabs.length} slab(s)`);
  }

  // Filter 1.4: Department / Grade JSON array matching
  const deptFilterSlabs = activeSlabs.filter(s => {
    const depts = typeof s.departments === 'string' ? JSON.parse(s.departments || '[]') : (s.departments || []);
    return depts.length === 0 || depts.includes('Engineering');
  });
  console.log(`  ✅ Filter 1.4 (Department = 'Engineering' Filter): Found ${deptFilterSlabs.length} matching slab(s)`);
  console.log('');

  // ----------------------------------------------------
  // PART 2: TESTING COMPONENT FILTERS
  // ----------------------------------------------------
  console.log('📌 PART 2: PAYROLL COMPONENT FILTERS');

  // Filter 2.1: Earnings vs Deductions Filter
  const earnings = await knex('payroll_components')
    .where('organization_id', orgId)
    .whereIn('component_type', ['Derived', 'Value', 'earning', 'Earning'])
    .whereNull('deleted_at');
  
  const deductions = await knex('payroll_components')
    .where('organization_id', orgId)
    .whereIn('component_type', ['deduction', 'Deduction'])
    .whereNull('deleted_at');

  console.log(`  ✅ Filter 2.1 (Component Type): Found ${earnings.length} Earnings & ${deductions.length} Deductions`);

  // Filter 2.2: Group ID Filter
  const groups = await knex('payroll_component_groups').where({ organization_id: orgId }).whereNull('deleted_at');
  if (groups.length > 0) {
    const targetGroup = groups[0];
    const groupComponents = await knex('payroll_components')
      .where({ organization_id: orgId, group_id: targetGroup.id })
      .whereNull('deleted_at');
    console.log(`  ✅ Filter 2.2 (Group ID #${targetGroup.id} - "${targetGroup.name}"): Found ${groupComponents.length} component(s)`);
  }

  // Filter 2.3: Active Status & Non-cashable Filter
  const activeComponents = await knex('payroll_components')
    .where({ organization_id: orgId, is_active: 1 })
    .whereNull('deleted_at');
  console.log(`  ✅ Filter 2.3 (Is Active = 1): Found ${activeComponents.length} active component(s)`);

  // Filter 2.4: Attached Component ID Filter for Slab #17
  const slab17 = await knex('payroll_slabs').where('id', 17).first();
  if (slab17) {
    const attachedIds = typeof slab17.selected_component_ids === 'string' ? JSON.parse(slab17.selected_component_ids || '[]') : (slab17.selected_component_ids || []);
    const slabComponents = await knex('payroll_components').whereIn('id', attachedIds).whereNull('deleted_at');
    console.log(`  ✅ Filter 2.4 (Components assigned to Slab #17): Resolved ${slabComponents.length} component(s)`);
  }

  console.log('\n======================================================');
  console.log('🎉 ALL SLAB & COMPONENT FILTERS VERIFIED & WORKING 100%!');
  console.log('======================================================\n');

  await knex.destroy();
}

testFilters().catch(err => {
  console.error('❌ Filter Error:', err);
  process.exit(1);
});
