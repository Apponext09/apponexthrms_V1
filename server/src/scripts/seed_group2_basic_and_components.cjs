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

async function seedBasicGroupAnd2Components() {
  console.log('===========================================================');
  console.log('⚙️ SEEDING GROUP 2 (Basic) & 2 COMPONENTS (Basic, Basic 50%)');
  console.log('===========================================================\n');

  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;

    // 1. Insert "Basic" Earning Group
    const [groupId] = await db('payroll_component_groups').insert({
      uuid: 'basic-group-uuid-002',
      organization_id: orgId,
      name: 'Basic',
      category: 'Earning',
      round_format: 'Round Up',
      group_function: 'Max',
      configure_on_profile: 1,
      display_on_profile: 1,
      is_editable: 0,
      contributed_by: 'Employee',
      is_active: 1,
      recalculate_on_change: 0,
      group_for_payslip: 'Choose',
      display_order: 1,
      disable_arrear: 0,
      display_total_on_process: 0,
      tds_same_month: 0,
      is_taxable: 1,
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log(`✅ 1. Created Group: "Basic" (ID: ${groupId})`);

    // 2. Insert 2 Components under Basic
    await db('payroll_components').insert([
      {
        uuid: 'comp-basic-inactive-003',
        organization_id: orgId,
        group_id: groupId,
        name: 'Basic',
        component_type: 'Derived',
        formula: 'CTC * 0.50',
        based_on_attendance: 0,
        non_cashable: 0,
        is_active: 0,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        uuid: 'comp-basic50-active-004',
        organization_id: orgId,
        group_id: groupId,
        name: 'Basic 50%',
        component_type: 'Derived',
        formula: 'GROSS * 0.50',
        based_on_attendance: 0,
        non_cashable: 0,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    console.log('✅ 2. Created 2 Components under "Basic":');
    console.log('   - Component 1: "Basic" (Type: DERIVED, Attendance: No, Active: No)');
    console.log('   - Component 2: "Basic 50%" (Type: DERIVED, Attendance: No, Active: Yes)');

    console.log('\n===========================================================');
    console.log('🎉 GROUP 2 "Basic" & 2 COMPONENTS ADDED CLEANLY 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await db.destroy();
  }
}

seedBasicGroupAnd2Components();
