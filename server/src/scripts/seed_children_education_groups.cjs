const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedChildrenEducationGroups() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== SEEDING CHILDREN EDUCATION ALLOWANCE GROUPS FROM SCREENSHOT ===\n');

  // 1. Group 4: "Children Education Allowance" (Value component)
  const [g4Res] = await conn.query(
    `INSERT INTO payroll_component_groups 
      (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
     VALUES (?, ?, 'Children Education Allowance', 'Earning', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Car Allowance', 10, 1, 0, 0, 1)`,
    [uuidv4(), orgId]
  );
  const g4Id = g4Res.insertId;
  console.log(`✅ Created Group #4: "Children Education Allowance" (ID: ${g4Id})`);

  // Component 4.1: Children Education Allowance (Type: Value, Amount: 0.00, Att: No, Active: Yes, Boundary: Fixed)
  const [c41Res] = await conn.query(
    `INSERT INTO payroll_components 
      (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
     VALUES (?, ?, ?, 'Children Education Allowance', 'Value', 0.00, NULL, 0, 0, 'Fixed', 1)`,
    [uuidv4(), orgId, g4Id]
  );
  console.log(`  └─ Comp 4.1: "Children Education Allowance" [Value, Amount: 0, Att: No, Boundary: Fixed, Active: Yes] (ID: ${c41Res.insertId})`);

  // 2. Group 5: "Children Education Allowance Earned" (Derived attendance component)
  const [g5Res] = await conn.query(
    `INSERT INTO payroll_component_groups 
      (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
     VALUES (?, ?, 'Children Education Allowance Earned', 'Earning', 'Round', 'Max', 0, 0, 0, 'Employee', 1, 'Car Allowance', 0, 0, 0, 0, 1)`,
    [uuidv4(), orgId]
  );
  const g5Id = g5Res.insertId;
  console.log(`\n✅ Created Group #5: "Children Education Allowance Earned" (ID: ${g5Id})`);

  // Component 5.1: Children Education Allowance Earned (Type: Derived, Formula: [CHILDREN EDUCATION ALLOWANCE], Att: Yes, Active: Yes)
  const [c51Res] = await conn.query(
    `INSERT INTO payroll_components 
      (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, is_active)
     VALUES (?, ?, ?, 'Children Education Allowance Earned', 'Derived', 0.00, '[CHILDREN EDUCATION ALLOWANCE]', 1, 0, 1)`,
    [uuidv4(), orgId, g5Id]
  );
  console.log(`  └─ Comp 5.1: "Children Education Allowance Earned" [Derived: [CHILDREN EDUCATION ALLOWANCE], Att: Yes, Active: Yes] (ID: ${c51Res.insertId})`);

  // 3. Update Pay Slab 2 with active components
  const [activeComps] = await conn.query(
    'SELECT id FROM payroll_components WHERE organization_id = ? AND is_active = 1 AND deleted_at IS NULL ORDER BY id ASC',
    [orgId]
  );
  const compIds = activeComps.map(c => c.id);
  await conn.query('UPDATE payroll_slabs SET selected_component_ids = ? WHERE id = 2', [JSON.stringify(compIds)]);
  console.log('\n✅ Pay Slab #2 updated with active components:', compIds);

  await conn.end();
  process.exit(0);
}

seedChildrenEducationGroups().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
