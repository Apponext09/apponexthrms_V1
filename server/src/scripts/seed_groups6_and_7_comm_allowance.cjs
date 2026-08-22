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

async function seedCommunicationAllowanceGroupsAndComponents() {
  console.log('===========================================================');
  console.log('⚙️ SEEDING GROUPS 6 & 7 (Communication Allowance & Earned)');
  console.log('===========================================================\n');

  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;

    // 1. Group 6: "Communication Allowance"
    const [groupId6] = await db('payroll_component_groups').insert({
      uuid: 'comm-allowance-group-uuid-006',
      organization_id: orgId,
      name: 'Communication Allowance',
      category: 'Earning',
      round_format: 'Round',
      group_function: 'Max',
      configure_on_profile: 1,
      display_on_profile: 1,
      is_editable: 0,
      contributed_by: 'Employee',
      is_active: 1,
      recalculate_on_change: 0,
      group_for_payslip: 'Choose',
      display_order: 9,
      disable_arrear: 0,
      display_total_on_process: 0,
      tds_same_month: 0,
      is_taxable: 1,
      created_at: new Date(),
      updated_at: new Date()
    });

    await db('payroll_components').insert([
      {
        uuid: 'comp-comm-allowance-008',
        organization_id: orgId,
        group_id: groupId6,
        name: 'Communication Allowance',
        component_type: 'Value',
        amount: 0,
        based_on_attendance: 0,
        non_cashable: 0,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
    console.log('✅ 1. Created Group 6: "Communication Allowance" with Component "Communication Allowance" (Type: Value, Amount: 0, Attendance: No, Active: Yes)');

    // 2. Group 7: "Communication Allowance Earned"
    const [groupId7] = await db('payroll_component_groups').insert({
      uuid: 'comm-allowance-earned-group-uuid-007',
      organization_id: orgId,
      name: 'Communication Allowance Earned',
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

    await db('payroll_components').insert([
      {
        uuid: 'comp-comm-allowance-earned-009',
        organization_id: orgId,
        group_id: groupId7,
        name: 'Communication Allowance Earned',
        component_type: 'Derived',
        formula: 'COMMUNICATION_ALLOWANCE * (PRESENT_DAYS / TOTAL_DAYS)',
        based_on_attendance: 1,
        non_cashable: 0,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
    console.log('✅ 2. Created Group 7: "Communication Allowance Earned" with Component "Communication Allowance Earned" (Type: Derived, Attendance: Yes, Active: Yes)');

    console.log('\n===========================================================');
    console.log('🎉 GROUPS 6 & 7 ADDED CLEANLY 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await db.destroy();
  }
}

seedCommunicationAllowanceGroupsAndComponents();
