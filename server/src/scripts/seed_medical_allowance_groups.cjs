const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedMedicalAllowanceGroups() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== SEEDING MEDICAL ALLOWANCE & EARNED GROUPS ===\n');

  // 1. Group: "Medical Allowance"
  let [medGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Medical Allowance', orgId]
  );
  let medGroupId;
  if (medGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Medical Allowance', 'Earning', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Car Allowance', 10, 1, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    medGroupId = res.insertId;
    console.log(`✅ Created Group: "Medical Allowance" (ID: ${medGroupId})`);
  } else {
    medGroupId = medGroup[0].id;
  }

  let [medComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Medical Allowance', medGroupId]
  );
  if (medComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Medical Allowance', 'Derived', 0.00, '(5 * [CTC])/100', 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, medGroupId]
    );
    console.log(`  └─ Created Component: "Medical Allowance" [Derived: (5 * [CTC])/100] (ID: ${res.insertId})`);
  } else {
    await conn.query(
      `UPDATE payroll_components 
       SET component_type = 'Derived',
           formula = '(5 * [CTC])/100',
           based_on_attendance = 0,
           boundary_type = 'Choose',
           is_active = 1
       WHERE id = ?`,
      [medComp[0].id]
    );
  }

  // 2. Group: "Medical Allowance Earned"
  let [medeGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Medical Allowance Earned', orgId]
  );
  let medeGroupId;
  if (medeGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Medical Allowance Earned', 'Earning', 'Round', 'Max', 0, 0, 0, 'Employee', 1, 'Car Allowance', 0, 0, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    medeGroupId = res.insertId;
    console.log(`\n✅ Created Group: "Medical Allowance Earned" (ID: ${medeGroupId})`);
  } else {
    medeGroupId = medeGroup[0].id;
  }

  let [medeComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Medical Allowance Earned', medeGroupId]
  );
  if (medeComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Medical Allowance Earned', 'Derived', 0.00, '[MEDICAL_ALLOWANCE]', 1, 0, 'Choose', 1)`,
      [uuidv4(), orgId, medeGroupId]
    );
    console.log(`  └─ Created Component: "Medical Allowance Earned" [Derived: [MEDICAL_ALLOWANCE], Att: Yes] (ID: ${res.insertId})`);
  }

  // 3. Update Pay Slab
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

seedMedicalAllowanceGroups().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
