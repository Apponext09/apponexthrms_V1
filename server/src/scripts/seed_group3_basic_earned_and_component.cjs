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

async function seedBasicEarnedGroupAndComponent() {
  console.log('===========================================================');
  console.log('⚙️ SEEDING GROUP 3 (Basic Earned) & COMPONENT (Basic Earned)');
  console.log('===========================================================\n');

  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;

    // 1. Insert "Basic Earned" Earning Group
    const [groupId] = await db('payroll_component_groups').insert({
      uuid: 'basic-earned-group-uuid-003',
      organization_id: orgId,
      name: 'Basic Earned',
      category: 'Earning',
      round_format: 'Round',
      group_function: 'Max',
      configure_on_profile: 0,
      display_on_profile: 0,
      is_editable: 0,
      contributed_by: 'Employee',
      is_active: 1,
      recalculate_on_change: 0,
      group_for_payslip: 'Basic',
      display_order: 0,
      disable_arrear: 0,
      display_total_on_process: 0,
      tds_same_month: 0,
      is_taxable: 1,
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log(`✅ 1. Created Group: "Basic Earned" (ID: ${groupId})`);

    // 2. Insert Component under Basic Earned
    await db('payroll_components').insert([
      {
        uuid: 'comp-basic-earned-active-005',
        organization_id: orgId,
        group_id: groupId,
        name: 'Basic Earned',
        component_type: 'Derived',
        formula: 'BASIC * (PRESENT_DAYS / TOTAL_DAYS)',
        based_on_attendance: 1,
        non_cashable: 0,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    console.log('✅ 2. Created Component under "Basic Earned":');
    console.log('   - Component: "Basic Earned" (Type: DERIVED, Attendance: Yes, Active: Yes)');

    console.log('\n===========================================================');
    console.log('🎉 GROUP 3 "Basic Earned" & COMPONENT ADDED CLEANLY 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await db.destroy();
  }
}

seedBasicEarnedGroupAndComponent();
