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

async function seedChildrenEducationAllowanceEarnedGroupAndComponent() {
  console.log('===========================================================');
  console.log('⚙️ SEEDING GROUP 5 (Children Education Allowance Earned) & COMPONENT');
  console.log('===========================================================\n');

  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;

    // 1. Insert "Children Education Allowance Earned" Earning Group
    const [groupId] = await db('payroll_component_groups').insert({
      uuid: 'children-edu-earned-group-uuid-005',
      organization_id: orgId,
      name: 'Children Education Allowance Earned',
      category: 'Earning',
      round_format: 'Round',
      group_function: 'Max',
      configure_on_profile: 0,
      display_on_profile: 0,
      is_editable: 0,
      contributed_by: 'Employee',
      is_active: 1,
      recalculate_on_change: 0,
      group_for_payslip: 'Choose',
      display_order: 0,
      disable_arrear: 0,
      display_total_on_process: 0,
      tds_same_month: 0,
      is_taxable: 1,
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log(`✅ 1. Created Group: "Children Education Allowance Earned" (ID: ${groupId})`);

    // 2. Insert Component under Children Education Allowance Earned
    await db('payroll_components').insert([
      {
        uuid: 'comp-children-edu-earned-active-007',
        organization_id: orgId,
        group_id: groupId,
        name: 'Children Education Allowance Earned',
        component_type: 'Derived',
        formula: 'CHILDREN_EDUCATION_ALLOWANCE * (PRESENT_DAYS / TOTAL_DAYS)',
        based_on_attendance: 1,
        non_cashable: 0,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    console.log('✅ 2. Created Component under "Children Education Allowance Earned":');
    console.log('   - Component: "Children Education Allowance Earned" (Type: DERIVED, Attendance: Yes, Active: Yes)');

    console.log('\n===========================================================');
    console.log('🎉 GROUP 5 "Children Education Allowance Earned" & COMPONENT ADDED CLEANLY 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await db.destroy();
  }
}

seedChildrenEducationAllowanceEarnedGroupAndComponent();
