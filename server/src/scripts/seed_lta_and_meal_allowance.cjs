const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedLtaAndMealAllowance() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== UPDATING LTA & ADDING LTA EARNED & MEAL ALLOWANCE ===\n');

  // 1. Update LTA Allowance to Value: 0.00
  await conn.query(
    `UPDATE payroll_components 
     SET component_type = 'Value',
         amount = 0.00,
         formula = NULL,
         based_on_attendance = 0,
         boundary_type = 'Choose',
         is_active = 1
     WHERE name = 'LTA Allowance'`
  );
  console.log('✅ Updated "LTA Allowance" -> Value: 0.00');

  // 2. Group: "LTA Earned"
  let [ltaeGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['LTA Earned', orgId]
  );
  let ltaeGroupId;
  if (ltaeGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'LTA Earned', 'Earning', 'Round', 'Max', 0, 0, 0, 'Employee', 1, 'Car Allowance', 0, 0, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    ltaeGroupId = res.insertId;
    console.log(`✅ Created Group: "LTA Earned" (ID: ${ltaeGroupId})`);
  } else {
    ltaeGroupId = ltaeGroup[0].id;
  }

  let [ltaeComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['LTA Allowance Earned', ltaeGroupId]
  );
  if (ltaeComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'LTA Allowance Earned', 'Derived', 0.00, '[LTA_ALLOWANCE]', 1, 0, 'Choose', 1)`,
      [uuidv4(), orgId, ltaeGroupId]
    );
    console.log(`  └─ Created Component: "LTA Allowance Earned" [Derived: [LTA_ALLOWANCE], Att: Yes] (ID: ${res.insertId})`);
  }

  // 3. Group: "Meal Allowance"
  let [mealGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Meal Allowance', orgId]
  );
  let mealGroupId;
  if (mealGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Meal Allowance', 'Earning', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Car Allowance', 10, 1, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    mealGroupId = res.insertId;
    console.log(`\n✅ Created Group: "Meal Allowance" (ID: ${mealGroupId})`);
  } else {
    mealGroupId = mealGroup[0].id;
  }

  let [mealComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Meal Allowance', mealGroupId]
  );
  if (mealComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Meal Allowance', 'Value', 0.00, NULL, 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, mealGroupId]
    );
    console.log(`  └─ Created Component: "Meal Allowance" [Value, 0.00] (ID: ${res.insertId})`);
  }

  // 4. Update Pay Slab
  const [activeComps] = await conn.query(
    'SELECT id FROM payroll_components WHERE organization_id = ? AND is_active = 1 AND deleted_at IS NULL ORDER BY id ASC',
    [orgId]
  );
  const compIds = activeComps.map(c => c.id);
  await conn.query('UPDATE payroll_slabs SET selected_component_ids = ? WHERE id = 2', [JSON.stringify(compIds)]);
  console.log('\n✅ Pay Slab #2 updated with all active components:', compIds);

  await conn.end();
  process.exit(0);
}

seedLtaAndMealAllowance().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
