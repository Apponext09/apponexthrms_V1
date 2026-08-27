const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedConveyanceGroups() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== SEEDING CONVEYANCE GROUPS FROM SCREENSHOT ===\n');

  // 1. Update Communication Allowance boundary_type to 'Choose'
  await conn.query(
    `UPDATE payroll_components 
     SET boundary_type = 'Choose' 
     WHERE name = 'Communication Allowance'`
  );
  console.log('✅ Updated "Communication Allowance" boundary_type to "Choose"');

  // 2. Group 8: "Conveyance" (Value component)
  const [g8Res] = await conn.query(
    `INSERT INTO payroll_component_groups 
      (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
     VALUES (?, ?, 'Conveyance', 'Earning', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Car Allowance', 10, 1, 0, 0, 1)`,
    [uuidv4(), orgId]
  );
  const g8Id = g8Res.insertId;
  console.log(`\n✅ Created Group #8: "Conveyance" (ID: ${g8Id})`);

  // Component 8.1: Conveyance
  const [c81Res] = await conn.query(
    `INSERT INTO payroll_components 
      (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
     VALUES (?, ?, ?, 'Conveyance', 'Value', 0.00, NULL, 0, 0, 'Choose', 1)`,
    [uuidv4(), orgId, g8Id]
  );
  console.log(`  └─ Comp 8.1: "Conveyance" [Value, Amount: 0, Att: No, Boundary: Choose, Active: Yes] (ID: ${c81Res.insertId})`);

  // 3. Group 9: "Conveyance Earned" (Derived attendance component)
  const [g9Res] = await conn.query(
    `INSERT INTO payroll_component_groups 
      (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
     VALUES (?, ?, 'Conveyance Earned', 'Earning', 'Round', 'Max', 0, 0, 0, 'Employee', 1, 'Car Allowance', 0, 0, 0, 0, 1)`,
    [uuidv4(), orgId]
  );
  const g9Id = g9Res.insertId;
  console.log(`\n✅ Created Group #9: "Conveyance Earned" (ID: ${g9Id})`);

  // Component 9.1: Conveyance Earned
  const [c91Res] = await conn.query(
    `INSERT INTO payroll_components 
      (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, is_active)
     VALUES (?, ?, ?, 'Conveyance Earned', 'Derived', 0.00, '[CONVEYANCE]', 1, 0, 1)`,
    [uuidv4(), orgId, g9Id]
  );
  console.log(`  └─ Comp 9.1: "Conveyance Earned" [Derived: [CONVEYANCE], Att: Yes, Active: Yes] (ID: ${c91Res.insertId})`);

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

seedConveyanceGroups().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
