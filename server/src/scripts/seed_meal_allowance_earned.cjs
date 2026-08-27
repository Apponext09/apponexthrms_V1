const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedMealAllowanceEarned() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== SEEDING MEAL ALLOWANCE EARNED GROUP FROM SCREENSHOT ===\n');

  // 1. Group: "Meal Allowance Earned"
  let [maeGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Meal Allowance Earned', orgId]
  );
  let maeGroupId;
  if (maeGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Meal Allowance Earned', 'Earning', 'Round', 'Max', 0, 0, 0, 'Employee', 1, 'Car Allowance', 0, 0, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    maeGroupId = res.insertId;
    console.log(`✅ Created Group: "Meal Allowance Earned" (ID: ${maeGroupId})`);
  } else {
    maeGroupId = maeGroup[0].id;
  }

  let [maeComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Meal Allowance Earned', maeGroupId]
  );
  if (maeComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Meal Allowance Earned', 'Derived', 0.00, '[MEAL_ALLOWANCE]', 1, 0, 'Choose', 1)`,
      [uuidv4(), orgId, maeGroupId]
    );
    console.log(`  └─ Created Component: "Meal Allowance Earned" [Derived: [MEAL_ALLOWANCE], Att: Yes] (ID: ${res.insertId})`);
  } else {
    await conn.query(
      `UPDATE payroll_components 
       SET component_type = 'Derived',
           formula = '[MEAL_ALLOWANCE]',
           based_on_attendance = 1,
           is_active = 1
       WHERE id = ?`,
      [maeComp[0].id]
    );
  }

  // 2. Update Pay Slab
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

seedMealAllowanceEarned().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
