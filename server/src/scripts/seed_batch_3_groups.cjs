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

async function seedBatch3Groups() {
  console.log('===========================================================');
  console.log('⚙️ SEEDING 3 GROUPS: Conveyance Earned, ECR Gross Amount, Extra Pay Amount');
  console.log('===========================================================\n');

  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;

    // 1. Group: "Conveyance Earned"
    const [groupId1] = await db('payroll_component_groups').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      name: 'Conveyance Earned',
      category: 'Earning',
      round_format: 'Round Up',
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
        uuid: uuidv4(),
        organization_id: orgId,
        group_id: groupId1,
        name: 'Conveyance Earned',
        component_type: 'Derived',
        formula: 'CONVEYANCE * (PRESENT_DAYS / TOTAL_DAYS)',
        based_on_attendance: 1,
        non_cashable: 0,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
    console.log('✅ 1. Created Group: "Conveyance Earned" with Component "Conveyance Earned"');

    // 2. Group: "ECR Gross Amount"
    const [groupId2] = await db('payroll_component_groups').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      name: 'ECR Gross Amount',
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
        uuid: uuidv4(),
        organization_id: orgId,
        group_id: groupId2,
        name: 'ECR Gross Amount',
        component_type: 'Derived',
        formula: 'GROSS_EARNED',
        based_on_attendance: 0,
        non_cashable: 0,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
    console.log('✅ 2. Created Group: "ECR Gross Amount" with Component "ECR Gross Amount"');

    // 3. Group: "Extra Pay Amount"
    const [groupId3] = await db('payroll_component_groups').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      name: 'Extra Pay Amount',
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
        uuid: uuidv4(),
        organization_id: orgId,
        group_id: groupId3,
        name: 'Extra pay amount',
        component_type: 'Derived',
        formula: 'OVERTIME_HOURS * (BASIC / 240)',
        based_on_attendance: 0,
        non_cashable: 0,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
    console.log('✅ 3. Created Group: "Extra Pay Amount" with Component "Extra pay amount"');

    console.log('\n===========================================================');
    console.log('🎉 ALL 3 GROUPS & COMPONENTS ADDED CLEANLY 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await db.destroy();
  }
}

seedBatch3Groups();
