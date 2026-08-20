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

async function seedPFDeductionGroupAndComponents() {
  console.log('===========================================================');
  console.log('⚙️ SEEDING DEDUCTION GROUP: PF & 4 COMPONENTS');
  console.log('===========================================================\n');

  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;

    // 1. Insert "PF" Deduction Group
    const [groupId] = await db('payroll_component_groups').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      name: 'PF',
      category: 'Deduction',
      round_format: 'Round',
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
      is_taxable: 0,
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log(`✅ 1. Created Deduction Group: "PF" (ID: ${groupId})`);

    // 2. Insert 4 Components under PF
    await db('payroll_components').insert([
      {
        uuid: uuidv4(),
        organization_id: orgId,
        group_id: groupId,
        name: 'November 2019 onwards',
        component_type: 'Derived',
        formula: '(12 * [BASIC]) / 100',
        based_on_attendance: 0,
        non_cashable: 0,
        is_active: 0,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        uuid: uuidv4(),
        organization_id: orgId,
        group_id: groupId,
        name: 'PF 12% on Basic',
        component_type: 'Derived',
        formula: '(12 * [BASIC_EARNED]) / 100',
        based_on_attendance: 1,
        non_cashable: 0,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        uuid: uuidv4(),
        organization_id: orgId,
        group_id: groupId,
        name: 'PF Employee',
        component_type: 'Derived',
        formula: '(12 * [BASIC]) / 100',
        based_on_attendance: 0,
        non_cashable: 0,
        is_active: 0,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        uuid: uuidv4(),
        organization_id: orgId,
        group_id: groupId,
        name: 'PF jan to march',
        component_type: 'Derived',
        formula: '(12 * [BASIC]) / 100',
        based_on_attendance: 0,
        non_cashable: 0,
        is_active: 0,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    console.log('✅ 2. Created 4 Components under "PF":');
    console.log('   - 1. "November 2019 onwards" (DERIVED, Attendance: No, Active: No)');
    console.log('   - 2. "PF 12% on Basic" (DERIVED, Attendance: Yes, Active: Yes)');
    console.log('   - 3. "PF Employee" (DERIVED, Attendance: No, Active: No)');
    console.log('   - 4. "PF jan to march" (DERIVED, Attendance: No, Active: No)');

    console.log('\n===========================================================');
    console.log('🎉 DEDUCTION GROUP "PF" & 4 COMPONENTS ADDED CLEANLY 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await db.destroy();
  }
}

seedPFDeductionGroupAndComponents();
