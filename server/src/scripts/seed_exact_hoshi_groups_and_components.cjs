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

async function seedHoshiExact3GroupsOnly() {
  console.log('===========================================================');
  console.log('🧹 SEEDING EXACT 3 GROUPS FROM YOUR SCREENSHOTS');
  console.log('===========================================================\n');

  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;
    console.log(`Using organization_id: ${orgId} (${org ? org.name : 'Default'})`);

    // Clear previous groups and components for clean state
    await db('payroll_component_groups').where({ organization_id: orgId }).update({ deleted_at: new Date() });
    await db('payroll_components').where({ organization_id: orgId }).update({ deleted_at: new Date() });

    // ─────────────────────────────────────────────────────────
    // 1. Group 1: "Adjustment" (Screenshot 1)
    // ─────────────────────────────────────────────────────────
    const [groupId1] = await db('payroll_component_groups').insert({
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

    await db('payroll_components').insert([
      {
        uuid: 'comp-adjustment-uuid-001',
        organization_id: orgId,
        group_id: groupId1,
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
        uuid: 'comp-conveyance-uuid-002',
        organization_id: orgId,
        group_id: groupId1,
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
    console.log('✅ 1. Group "Adjustment" created with components: Adjustment (Active: Yes) & Conveyance (Active: No)');

    // ─────────────────────────────────────────────────────────
    // 2. Group 2: "Basic" (Screenshot 2)
    // ─────────────────────────────────────────────────────────
    const [groupId2] = await db('payroll_component_groups').insert({
      uuid: 'basic-group-uuid-002',
      organization_id: orgId,
      name: 'Basic',
      category: 'Earning',
      round_format: 'Round Up',
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
      display_total_on_process: 1,
      tds_same_month: 0,
      is_taxable: 1,
      created_at: new Date(),
      updated_at: new Date()
    });

    await db('payroll_components').insert([
      {
        uuid: 'comp-basic-inactive-003',
        organization_id: orgId,
        group_id: groupId2,
        name: 'Basic',
        component_type: 'Derived',
        formula: 'CTC * 0.50',
        based_on_attendance: 0,
        non_cashable: 0,
        is_active: 0,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        uuid: 'comp-basic50-active-004',
        organization_id: orgId,
        group_id: groupId2,
        name: 'Basic 50%',
        component_type: 'Derived',
        formula: 'GROSS * 0.50',
        based_on_attendance: 0,
        non_cashable: 0,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
    console.log('✅ 2. Group "Basic" created with components: Basic (Active: No) & Basic 50% (Active: Yes)');

    // ─────────────────────────────────────────────────────────
    // 3. Group 3: "Basic Earned" (Screenshot 3)
    // ─────────────────────────────────────────────────────────
    const [groupId3] = await db('payroll_component_groups').insert({
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

    await db('payroll_components').insert({
      uuid: 'comp-basic-earned-active-005',
      organization_id: orgId,
      group_id: groupId3,
      name: 'Basic Earned',
      component_type: 'Derived',
      formula: 'BASIC * (PRESENT_DAYS / TOTAL_DAYS)',
      based_on_attendance: 1,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    });
    console.log('✅ 3. Group "Basic Earned" created with component: Basic Earned (Active: Yes)');

    console.log('\n===========================================================');
    console.log('🎉 EXACT 3 GROUPS & COMPONENTS SEEDED SUCCESSFULLY 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ Error seeding configuration:', err);
  } finally {
    await db.destroy();
  }
}

seedHoshiExact3GroupsOnly();
