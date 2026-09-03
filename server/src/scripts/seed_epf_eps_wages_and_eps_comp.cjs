const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedEpfEpsWagesAndEpsComp() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== SEEDING EPF EPS WAGES & EPS COMPONENT GROUPS ===\n');

  // 1. Group: "EPF EPS Wages"
  let [wagesGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND category = \"Deduction\" AND deleted_at IS NULL',
    ['EPF EPS Wages', orgId]
  );
  let wagesGroupId;
  if (wagesGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'EPF EPS Wages', 'Deduction', 'Round', 'Max', 0, 0, 1, 'Employer', 1, 'Choose', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    wagesGroupId = res.insertId;
    console.log(`✅ Created Deduction Group: "EPF EPS Wages" (ID: ${wagesGroupId})`);
  } else {
    wagesGroupId = wagesGroup[0].id;
  }

  let [wagesComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['EPF EPS Wages', wagesGroupId]
  );
  if (wagesComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'EPF EPS Wages', 'Derived', 0.00, '[BASIC_EARNED]+[PROFESSIONAL_ALLOWANCE_EARNED]', 0, 0, 'Fixed', 1)`,
      [uuidv4(), orgId, wagesGroupId]
    );
    console.log(`  └─ Created Component: "EPF EPS Wages" [Derived: [BASIC_EARNED]+[PROFESSIONAL_ALLOWANCE_EARNED]] (ID: ${res.insertId})`);
  } else {
    await conn.query(
      `UPDATE payroll_components 
       SET component_type = 'Derived',
           formula = '[BASIC_EARNED]+[PROFESSIONAL_ALLOWANCE_EARNED]',
           based_on_attendance = 0,
           boundary_type = 'Fixed',
           is_active = 1
       WHERE id = ?`,
      [wagesComp[0].id]
    );
  }

  // 2. Group: "EPS Component"
  let [epsGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND category = \"Deduction\" AND deleted_at IS NULL',
    ['EPS Component', orgId]
  );
  let epsGroupId;
  if (epsGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'EPS Component', 'Deduction', 'Round', 'Max', 0, 0, 1, 'Employer', 1, 'Choose', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    epsGroupId = res.insertId;
    console.log(`\n✅ Created Deduction Group: "EPS Component" (ID: ${epsGroupId})`);
  } else {
    epsGroupId = epsGroup[0].id;
  }

  let [epsComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['EPS Component', epsGroupId]
  );
  if (epsComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'EPS Component', 'Derived', 0.00, 'round([EDLI_WAGES] * 0.0833);', 0, 0, 'Fixed', 1)`,
      [uuidv4(), orgId, epsGroupId]
    );
    console.log(`  └─ Created Component: "EPS Component" (ID: ${res.insertId})`);
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

seedEpfEpsWagesAndEpsComp().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
