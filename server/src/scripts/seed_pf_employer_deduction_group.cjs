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

async function seedPFEmployerDeductionGroupAndComponent() {
  console.log('===========================================================');
  console.log('⚙️ SEEDING DEDUCTION GROUP: PF Employer & COMPONENT');
  console.log('===========================================================\n');

  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;

    // 1. Insert "PF Employer" Deduction Group (Contributed By: Employer)
    const [groupId] = await db('payroll_component_groups').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      name: 'PF Employer',
      category: 'Deduction',
      round_format: 'Round',
      group_function: 'Max',
      configure_on_profile: 0,
      display_on_profile: 1,
      is_editable: 0,
      contributed_by: 'Employer',
      is_active: 1,
      recalculate_on_change: 0,
      group_for_payslip: 'Choose',
      display_order: 23,
      disable_arrear: 0,
      display_total_on_process: 0,
      tds_same_month: 0,
      is_taxable: 0,
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log(`✅ 1. Created Deduction Group: "PF Employer" (ID: ${groupId})`);

    // 2. Insert Component under PF Employer
    await db('payroll_components').insert([
      {
        uuid: uuidv4(),
        organization_id: orgId,
        group_id: groupId,
        name: 'PF Employer',
        component_type: 'Derived',
        formula: '(12 * [BASIC_EARNED]) / 100',
        based_on_attendance: 1,
        non_cashable: 0,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    console.log('✅ 2. Created Component under "PF Employer":');
    console.log('   - Component: "PF Employer" (Type: DERIVED, Attendance: Yes, Active: Yes)');

    console.log('\n===========================================================');
    console.log('🎉 DEDUCTION GROUP "PF Employer" & COMPONENT ADDED CLEANLY 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await db.destroy();
  }
}

seedPFEmployerDeductionGroupAndComponent();
