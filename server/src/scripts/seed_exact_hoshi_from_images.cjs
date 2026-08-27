const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedExactHoshiFromImages() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== SEEDING EXACT CONFIGURATION FROM YOUR 3 SCREENSHOTS ===\n');

  // Clear existing to ensure 100% clean matching
  await conn.query('DELETE FROM payroll_components');
  await conn.query('DELETE FROM payroll_component_groups');
  await conn.query('ALTER TABLE payroll_component_groups AUTO_INCREMENT = 1');
  await conn.query('ALTER TABLE payroll_components AUTO_INCREMENT = 1');

  // ─────────────────────────────────────────────────────────────
  // 1. Group 1: "Adjustment" (Image 1)
  // ─────────────────────────────────────────────────────────────
  const [g1Res] = await conn.query(
    `INSERT INTO payroll_component_groups 
      (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, recalculate_on_change, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
     VALUES (?, ?, 'Adjustment', 'Earning', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 0, 'Car Allowance', 10, 1, 0, 0, 1)`,
    [uuidv4(), orgId]
  );
  const g1Id = g1Res.insertId;
  console.log(`✅ 1. Group #1: "Adjustment" (ID: ${g1Id})`);

  // Component 1.1: Adjustment
  const [c1Res] = await conn.query(
    `INSERT INTO payroll_components 
      (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, is_active)
     VALUES (?, ?, ?, 'Adjustment', 'Value', 0.00, NULL, 0, 0, 1)`,
    [uuidv4(), orgId, g1Id]
  );
  console.log(`  └─ Comp 1.1: "Adjustment" [Value, Amount: 0, Att: No, Active: Yes] (ID: ${c1Res.insertId})`);

  // Component 1.2: Conveyance
  const [c2Res] = await conn.query(
    `INSERT INTO payroll_components 
      (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, is_active)
     VALUES (?, ?, ?, 'Conveyance', 'Value', 0.00, NULL, 0, 0, 0)`,
    [uuidv4(), orgId, g1Id]
  );
  console.log(`  └─ Comp 1.2: "Conveyance" [Value, Amount: 0, Att: No, Active: No] (ID: ${c2Res.insertId})`);

  // ─────────────────────────────────────────────────────────────
  // 2. Group 2: "Basic" (Image 2)
  // ─────────────────────────────────────────────────────────────
  const [g2Res] = await conn.query(
    `INSERT INTO payroll_component_groups 
      (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, recalculate_on_change, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
     VALUES (?, ?, 'Basic', 'Earning', 'Round Up', 'Max', 1, 1, 0, 'Employee', 1, 0, 'Choose', 1, 0, 0, 0, 1)`,
    [uuidv4(), orgId]
  );
  const g2Id = g2Res.insertId;
  console.log(`\n✅ 2. Group #2: "Basic" (ID: ${g2Id})`);

  // Component 2.1: Basic (40%)
  const [c3Res] = await conn.query(
    `INSERT INTO payroll_components 
      (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, is_active)
     VALUES (?, ?, ?, 'Basic', 'Derived', 0.00, '(40 * [CTC])/100', 0, 0, 0)`,
    [uuidv4(), orgId, g2Id]
  );
  console.log(`  └─ Comp 2.1: "Basic" [Derived: (40 * [CTC])/100, Att: No, Active: No] (ID: ${c3Res.insertId})`);

  // Component 2.2: Basic 50%
  const [c4Res] = await conn.query(
    `INSERT INTO payroll_components 
      (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, is_active)
     VALUES (?, ?, ?, 'Basic 50%', 'Derived', 0.00, '(50 * [CTC])/100', 0, 0, 1)`,
    [uuidv4(), orgId, g2Id]
  );
  console.log(`  └─ Comp 2.2: "Basic 50%" [Derived: (50 * [CTC])/100, Att: No, Active: Yes] (ID: ${c4Res.insertId})`);

  // ─────────────────────────────────────────────────────────────
  // 3. Group 3: "Basic Earned" (Image 3)
  // ─────────────────────────────────────────────────────────────
  const [g3Res] = await conn.query(
    `INSERT INTO payroll_component_groups 
      (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, recalculate_on_change, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
     VALUES (?, ?, 'Basic Earned', 'Earning', 'Round', 'Max', 0, 0, 0, 'Employee', 1, 0, 'Basic', 0, 0, 0, 0, 1)`,
    [uuidv4(), orgId]
  );
  const g3Id = g3Res.insertId;
  console.log(`\n✅ 3. Group #3: "Basic Earned" (ID: ${g3Id})`);

  // Component 3.1: Basic Earned
  const [c5Res] = await conn.query(
    `INSERT INTO payroll_components 
      (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, is_active)
     VALUES (?, ?, ?, 'Basic Earned', 'Derived', 0.00, '[Basic Salary] * ([Present Days] / [Total Days])', 1, 0, 1)`,
    [uuidv4(), orgId, g3Id]
  );
  console.log(`  └─ Comp 3.1: "Basic Earned" [Derived: [Basic Salary] * ([Present Days] / [Total Days]), Att: Yes, Active: Yes] (ID: ${c5Res.insertId})`);

  // Update Pay Slab with active components
  const [activeComps] = await conn.query(
    'SELECT id FROM payroll_components WHERE organization_id = ? AND is_active = 1 AND deleted_at IS NULL ORDER BY id ASC',
    [orgId]
  );
  const compIds = activeComps.map(c => c.id);
  await conn.query('UPDATE payroll_slabs SET selected_component_ids = ? WHERE id = 2', [JSON.stringify(compIds)]);
  console.log('\n✅ Pay Slab updated with active component IDs:', compIds);

  await conn.end();
  process.exit(0);
}

seedExactHoshiFromImages().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
