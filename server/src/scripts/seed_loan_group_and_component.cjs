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

async function seedLoanGroupAndComponent() {
  console.log('===========================================================');
  console.log('⚙️ SEEDING DEDUCTION GROUP: Loan & MODULE COMPONENT (Loan EMI)');
  console.log('===========================================================\n');

  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;

    // 1. Insert "Loan" Deduction Group
    const [groupId] = await db('payroll_component_groups').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      name: 'Loan',
      category: 'Deduction',
      round_format: 'Round',
      group_function: 'Max',
      configure_on_profile: 0,
      display_on_profile: 1,
      is_editable: 0,
      contributed_by: 'Employee',
      is_active: 1,
      recalculate_on_change: 0,
      group_for_payslip: 'Choose',
      display_order: 15,
      disable_arrear: 1,
      display_total_on_process: 0,
      tds_same_month: 0,
      is_taxable: 0,
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log(`✅ 1. Created Deduction Group: "Loan" (ID: ${groupId})`);

    // 2. Insert Component under Loan with component_type = 'Module'
    await db('payroll_components').insert([
      {
        uuid: uuidv4(),
        organization_id: orgId,
        group_id: groupId,
        name: 'Loan EMI',
        component_type: 'Module',
        formula: 'LOAN_MODULE_SYNC',
        based_on_attendance: 0,
        non_cashable: 0,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    console.log('✅ 2. Created Module Component under "Loan":');
    console.log('   - Component: "Loan EMI" (Type: MODULE, Module: Loan, Attendance: No, Active: Yes)');

    console.log('\n===========================================================');
    console.log('🎉 LOAN DEDUCTION GROUP & MODULE COMPONENT ADDED CLEANLY 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await db.destroy();
  }
}

seedLoanGroupAndComponent();
