const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedExactUserGroups() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== SEEDING EXACT GROUPS WITH MULTIPLE COMPONENTS PER GROUP ===\n');

  // 1. Group 1: Adjustment
  await conn.query('DELETE FROM payroll_components');
  await conn.query('DELETE FROM payroll_component_groups');
  await conn.query('ALTER TABLE payroll_component_groups AUTO_INCREMENT = 1');
  await conn.query('ALTER TABLE payroll_components AUTO_INCREMENT = 1');

  const [adjGroupRes] = await conn.query(
    `INSERT INTO payroll_component_groups 
      (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
     VALUES (?, ?, 'Adjustment', 'Earning', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Car Allowance', 10, 1, 0, 0, 1)`,
    [uuidv4(), orgId]
  );
  const adjGroupId = adjGroupRes.insertId;
  console.log(`✅ Created Group #1: "Adjustment" (ID: ${adjGroupId})`);

  // Component 1.1: Adjustment
  const [c1Res] = await conn.query(
    `INSERT INTO payroll_components 
      (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, is_active)
     VALUES (?, ?, ?, 'Adjustment', 'Value', 0.00, NULL, 0, 0, 1)`,
    [uuidv4(), orgId, adjGroupId]
  );
  console.log(`  └─ Component #1.1: "Adjustment" [Value, Amount: 0, Att: No, Active: Yes] (ID: ${c1Res.insertId})`);

  // Component 1.2: Conveyance (inside Adjustment group)
  const [c2Res] = await conn.query(
    `INSERT INTO payroll_components 
      (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, is_active)
     VALUES (?, ?, ?, 'Conveyance', 'Value', 0.00, NULL, 0, 0, 0)`,
    [uuidv4(), orgId, adjGroupId]
  );
  console.log(`  └─ Component #1.2: "Conveyance" [Value, Amount: 0, Att: No, Active: No] (ID: ${c2Res.insertId})`);

  // 2. Group 2: Basic
  const [basicGroupRes] = await conn.query(
    `INSERT INTO payroll_component_groups 
      (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
     VALUES (?, ?, 'Basic', 'Earning', 'Round Up', 'Max', 1, 1, 0, 'Employee', 1, 'Choose', 1, 0, 0, 0, 1)`,
    [uuidv4(), orgId]
  );
  const basicGroupId = basicGroupRes.insertId;
  console.log(`\n✅ Created Group #2: "Basic" (ID: ${basicGroupId})`);

  // Component 2.1: Basic (40%)
  const [c3Res] = await conn.query(
    `INSERT INTO payroll_components 
      (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, is_active)
     VALUES (?, ?, ?, 'Basic', 'Derived', 0.00, '(40 * [CTC])/100', 0, 0, 0)`,
    [uuidv4(), orgId, basicGroupId]
  );
  console.log(`  └─ Component #2.1: "Basic" [Derived: (40 * [CTC])/100, Att: No, Active: No] (ID: ${c3Res.insertId})`);

  // Component 2.2: Basic 50%
  const [c4Res] = await conn.query(
    `INSERT INTO payroll_components 
      (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, is_active)
     VALUES (?, ?, ?, 'Basic 50%', 'Derived', 0.00, '(50 * [CTC])/100', 0, 0, 1)`,
    [uuidv4(), orgId, basicGroupId]
  );
  console.log(`  └─ Component #2.2: "Basic 50%" [Derived: (50 * [CTC])/100, Att: No, Active: Yes] (ID: ${c4Res.insertId})`);

  // 3. Update Pay Slab 2 with the active component IDs
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

seedExactUserGroups().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
