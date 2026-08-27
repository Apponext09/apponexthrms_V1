const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedCommunicationAllowanceGroups() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== SEEDING COMMUNICATION ALLOWANCE GROUPS FROM SCREENSHOT ===\n');

  // 1. Update Children Education Allowance Earned formula to [CHILDREN_EDUCATION_ALLOWANCE]
  await conn.query(
    `UPDATE payroll_components 
     SET formula = '[CHILDREN_EDUCATION_ALLOWANCE]' 
     WHERE name = 'Children Education Allowance Earned'`
  );
  console.log('✅ Updated "Children Education Allowance Earned" formula to [CHILDREN_EDUCATION_ALLOWANCE]');

  // 2. Group 6: "Communication Allowance" (Value component)
  const [g6Res] = await conn.query(
    `INSERT INTO payroll_component_groups 
      (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
     VALUES (?, ?, 'Communication Allowance', 'Earning', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Car Allowance', 10, 1, 0, 0, 1)`,
    [uuidv4(), orgId]
  );
  const g6Id = g6Res.insertId;
  console.log(`\n✅ Created Group #6: "Communication Allowance" (ID: ${g6Id})`);

  // Component 6.1: Communication Allowance
  const [c61Res] = await conn.query(
    `INSERT INTO payroll_components 
      (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
     VALUES (?, ?, ?, 'Communication Allowance', 'Value', 0.00, NULL, 0, 0, 'Fixed', 1)`,
    [uuidv4(), orgId, g6Id]
  );
  console.log(`  └─ Comp 6.1: "Communication Allowance" [Value, Amount: 0, Att: No, Boundary: Fixed, Active: Yes] (ID: ${c61Res.insertId})`);

  // 3. Group 7: "Communication Allowance Earned" (Derived attendance component)
  const [g7Res] = await conn.query(
    `INSERT INTO payroll_component_groups 
      (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
     VALUES (?, ?, 'Communication Allowance Earned', 'Earning', 'Round', 'Max', 0, 0, 0, 'Employee', 1, 'Car Allowance', 0, 0, 0, 0, 1)`,
    [uuidv4(), orgId]
  );
  const g7Id = g7Res.insertId;
  console.log(`\n✅ Created Group #7: "Communication Allowance Earned" (ID: ${g7Id})`);

  // Component 7.1: Communication Allowance Earned
  const [c71Res] = await conn.query(
    `INSERT INTO payroll_components 
      (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, is_active)
     VALUES (?, ?, ?, 'Communication Allowance Earned', 'Derived', 0.00, '[COMMUNICATION_ALLOWANCE]', 1, 0, 1)`,
    [uuidv4(), orgId, g7Id]
  );
  console.log(`  └─ Comp 7.1: "Communication Allowance Earned" [Derived: [COMMUNICATION_ALLOWANCE], Att: Yes, Active: Yes] (ID: ${c71Res.insertId})`);

  // 4. Update Pay Slab with all active components
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

seedCommunicationAllowanceGroups().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
