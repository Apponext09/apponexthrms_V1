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

async function checkComponentsAndGroups() {
  console.log('\n======================================================');
  console.log('🔍 AUDITING PAYROLL COMPONENTS & GROUP SETTINGS');
  console.log('======================================================\n');

  // 1. Audit Component Groups
  const groups = await knex('payroll_component_groups').whereNull('deleted_at');
  console.log(`📋 1. Total Payroll Component Groups: ${groups.length}`);
  console.table(groups.map(g => ({
    ID: g.id,
    Name: g.name,
    Category: g.category,
    RoundFormat: g.round_format,
    GroupFunction: g.group_function,
    IsActive: Boolean(g.is_active),
    OrgID: g.organization_id
  })));

  // 2. Audit Payroll Components
  const components = await knex('payroll_components').whereNull('deleted_at');
  console.log(`\n🧩 2. Total Payroll Components: ${components.length}`);
  console.table(components.map(c => ({
    ID: c.id,
    Name: c.name,
    Type: c.component_type || c.type,
    CalcType: c.calc_type,
    Formula: c.formula,
    GroupID: c.group_id,
    IsActive: Boolean(c.is_active),
    OrgID: c.organization_id
  })));

  // 3. Test Component Group Creation
  const testGroupName = `Executive Allowance Group (${Date.now().toString().slice(-4)})`;
  const groupPayload = {
    uuid: uuidv4(),
    organization_id: 68,
    name: testGroupName,
    category: 'Earning',
    round_format: 'Round',
    group_function: 'Max',
    configure_on_profile: 1,
    display_on_profile: 1,
    is_editable: 1,
    contributed_by: 'Employee',
    is_active: 1,
    recalculate_on_change: 0,
    group_for_payslip: 'Choose',
    display_order: 10,
    disable_arrear: 0,
    display_total_on_process: 0,
    tds_same_month: 0,
    is_taxable: 1,
    created_at: new Date(),
    updated_at: new Date()
  };

  const [groupId] = await knex('payroll_component_groups').insert(groupPayload);
  console.log(`\n✅ 3. Component Group Creation Test SUCCESSFUL! Created Group ID: #${groupId}`);

  // 4. Test Payroll Component Creation inside Created Group
  const testCompName = `Executive Travel Allowance (${Date.now().toString().slice(-4)})`;
  const compPayload = {
    uuid: uuidv4(),
    organization_id: 68,
    group_id: groupId,
    name: testCompName,
    component_type: 'Derived',
    calc_type: 'derived',
    formula: '0.15 * BASIC',
    non_cashable: 0,
    based_on_attendance: 1,
    is_active: 1,
    amount: 0,
    boundary_type: 'Choose',
    min_amount: 0,
    max_amount: 0,
    gender_filter: 'All',
    created_at: new Date(),
    updated_at: new Date()
  };

  const [compId] = await knex('payroll_components').insert(compPayload);
  console.log(`✅ 4. Payroll Component Creation Test SUCCESSFUL! Created Component ID: #${compId}`);

  // 5. Verify database storage
  const savedGroup = await knex('payroll_component_groups').where('id', groupId).first();
  const savedComp = await knex('payroll_components').where('id', compId).first();

  console.log('\n📋 5. Verified Saved DB Records:');
  console.log(' - Group Record:', { id: savedGroup.id, name: savedGroup.name, category: savedGroup.category, round_format: savedGroup.round_format });
  console.log(' - Component Record:', { id: savedComp.id, name: savedComp.name, formula: savedComp.formula, group_id: savedComp.group_id });

  console.log('\n======================================================');
  console.log('🎉 COMPONENTS & GROUP SETTINGS CREATION 100% VERIFIED!');
  console.log('======================================================\n');

  await knex.destroy();
}

checkComponentsAndGroups().catch(err => {
  console.error('❌ Audit Error:', err);
  process.exit(1);
});
