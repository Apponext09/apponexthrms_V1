const knex = require('knex');
const { v4: uuidv4 } = require('uuid');
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

async function seedConveyanceAllowanceGroupAndComponent() {
  console.log('===========================================================');
  console.log('⚙️ SEEDING GROUP (Conveyance Allowance) & COMPONENT');
  console.log('===========================================================\n');

  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;

    // 1. Insert "Conveyance Allowance" Earning Group
    const [groupId] = await db('payroll_component_groups').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      name: 'Conveyance Allowance',
      category: 'Earning',
      round_format: 'Round Down',
      group_function: 'Max',
      configure_on_profile: 1,
      display_on_profile: 1,
      is_editable: 0,
      contributed_by: 'Employee',
      is_active: 1,
      recalculate_on_change: 0,
      group_for_payslip: 'Choose',
      display_order: 6,
      disable_arrear: 0,
      display_total_on_process: 0,
      tds_same_month: 0,
      is_taxable: 1,
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log(`✅ 1. Created Group: "Conveyance Allowance" (ID: ${groupId})`);

    // 2. Insert Component under Conveyance Allowance
    await db('payroll_components').insert([
      {
        uuid: uuidv4(),
        organization_id: orgId,
        group_id: groupId,
        name: 'Conveyance Allowance',
        component_type: 'Derived',
        formula: 'GROSS * 0.10',
        based_on_attendance: 0,
        non_cashable: 0,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    console.log('✅ 2. Created Component under "Conveyance Allowance":');
    console.log('   - Component: "Conveyance Allowance" (Type: DERIVED, Attendance: No, Active: Yes)');

    console.log('\n===========================================================');
    console.log('🎉 GROUP "Conveyance Allowance" & COMPONENT ADDED CLEANLY 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await db.destroy();
  }
}

seedConveyanceAllowanceGroupAndComponent();
