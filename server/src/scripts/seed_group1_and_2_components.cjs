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

async function seedAdjustmentGroupAnd2Components() {
  console.log('===========================================================');
  console.log('⚙️ SEEDING 1 GROUP (Adjustment) & 2 COMPONENTS (Adjustment, Conveyance)');
  console.log('===========================================================\n');

  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;

    // Insert Adjustment Group
    const [groupId] = await db('payroll_component_groups').insert({
      uuid: 'adjustment-group-uuid-001',
      organization_id: orgId,
      name: 'Adjustment',
      category: 'Earning',
      round_format: 'Round',
      group_function: 'Max',
      configure_on_profile: 0,
      display_on_profile: 0,
      is_editable: 1,
      contributed_by: 'Employee',
      is_active: 1,
      recalculate_on_change: 0,
      group_for_payslip: 'Choose',
      display_order: 10,
      disable_arrear: 1,
      display_total_on_process: 0,
      tds_same_month: 0,
      is_taxable: 1,
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log(`✅ 1. Created Group: "Adjustment" (ID: ${groupId})`);

    // Insert 2 Components under Adjustment
    await db('payroll_components').insert([
      {
        uuid: 'comp-adjustment-001',
        organization_id: orgId,
        group_id: groupId,
        name: 'Adjustment',
        component_type: 'Value',
        amount: 0,
        based_on_attendance: 0,
        non_cashable: 0,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        uuid: 'comp-conveyance-002',
        organization_id: orgId,
        group_id: groupId,
        name: 'Conveyance',
        component_type: 'Value',
        amount: 0,
        based_on_attendance: 0,
        non_cashable: 0,
        is_active: 0,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    console.log('✅ 2. Created 2 Components under "Adjustment":');
    console.log('   - Component 1: "Adjustment" (Type: VALUE, Attendance: No, Active: Yes)');
    console.log('   - Component 2: "Conveyance" (Type: VALUE, Attendance: No, Active: No)');

    console.log('\n===========================================================');
    console.log('🎉 1 GROUP & 2 COMPONENTS ADDED CLEANLY 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await db.destroy();
  }
}

seedAdjustmentGroupAnd2Components();
