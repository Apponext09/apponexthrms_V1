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

async function seedTDSDeductionGroupAndComponent() {
  console.log('===========================================================');
  console.log('⚙️ SEEDING DEDUCTION GROUP: TDS & COMPONENT (Tds)');
  console.log('===========================================================\n');

  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;

    // 1. Insert "TDS" Deduction Group
    const [groupId] = await db('payroll_component_groups').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      name: 'TDS',
      category: 'Deduction',
      round_format: 'Round',
      group_function: 'Max',
      configure_on_profile: 0,
      display_on_profile: 0,
      is_editable: 1,
      contributed_by: 'Employee',
      is_active: 1,
      recalculate_on_change: 0,
      group_for_payslip: 'Choose',
      display_order: 2,
      disable_arrear: 0,
      display_total_on_process: 0,
      tds_same_month: 0,
      is_taxable: 0,
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log(`✅ 1. Created Deduction Group: "TDS" (ID: ${groupId})`);

    // 2. Insert Component under TDS
    await db('payroll_components').insert([
      {
        uuid: uuidv4(),
        organization_id: orgId,
        group_id: groupId,
        name: 'Tds',
        component_type: 'Value',
        amount: 0,
        based_on_attendance: 0,
        non_cashable: 0,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    console.log('✅ 2. Created Component under "TDS":');
    console.log('   - Component: "Tds" (Type: VALUE, Attendance: No, Active: Yes)');

    console.log('\n===========================================================');
    console.log('🎉 DEDUCTION GROUP "TDS" & COMPONENT ADDED CLEANLY 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await db.destroy();
  }
}

seedTDSDeductionGroupAndComponent();
