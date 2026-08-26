const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedProfessionalAllowanceGroups() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== SEEDING PROFESSIONAL ALLOWANCE & EARNED GROUPS ===\n');

  // 1. Group: "Professional Allowance"
  let [paGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Professional Allowance', orgId]
  );
  let paGroupId;
  if (paGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Professional Allowance', 'Earning', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Car Allowance', 10, 1, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    paGroupId = res.insertId;
    console.log(`✅ Created Group: "Professional Allowance" (ID: ${paGroupId})`);
  } else {
    paGroupId = paGroup[0].id;
  }

  let [paComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Professional Allowance', paGroupId]
  );
  if (paComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Professional Allowance', 'Derived', 0.00, '(25 * [CTC])/100', 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, paGroupId]
    );
    console.log(`  └─ Created Component: "Professional Allowance" [Derived: (25 * [CTC])/100] (ID: ${res.insertId})`);
  } else {
    await conn.query(
      `UPDATE payroll_components 
       SET component_type = 'Derived',
           formula = '(25 * [CTC])/100',
           based_on_attendance = 0,
           boundary_type = 'Choose',
           is_active = 1
       WHERE id = ?`,
      [paComp[0].id]
    );
  }

  // 2. Group: "Professional Allowance Earned"
  let [paeGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Professional Allowance Earned', orgId]
  );
  let paeGroupId;
  if (paeGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Professional Allowance Earned', 'Earning', 'Round', 'Max', 0, 0, 0, 'Employee', 1, 'Car Allowance', 0, 0, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    paeGroupId = res.insertId;
    console.log(`\n✅ Created Group: "Professional Allowance Earned" (ID: ${paeGroupId})`);
  } else {
    paeGroupId = paeGroup[0].id;
  }

  let [paeComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Professional Allowance Earned', paeGroupId]
  );
  if (paeComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Professional Allowance Earned', 'Derived', 0.00, '[PROFESSIONAL_ALLOWANCE]', 1, 0, 'Choose', 1)`,
      [uuidv4(), orgId, paeGroupId]
    );
    console.log(`  └─ Created Component: "Professional Allowance Earned" [Derived: [PROFESSIONAL_ALLOWANCE], Att: Yes] (ID: ${res.insertId})`);
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

seedProfessionalAllowanceGroups().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
