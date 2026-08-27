const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedEdliAndEpfDiff() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== SEEDING EDLI WAGES & EPF AND EPS DIFF ===\n');

  // 1. Group: "EDLI Wages"
  let [ewGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND category = \"Deduction\" AND deleted_at IS NULL',
    ['EDLI Wages', orgId]
  );
  let ewGroupId;
  if (ewGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'EDLI Wages', 'Deduction', 'Round', 'Max', 0, 0, 1, 'Employer', 1, 'Choose', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    ewGroupId = res.insertId;
    console.log(`✅ Created Deduction Group: "EDLI Wages" (ID: ${ewGroupId})`);
  } else {
    ewGroupId = ewGroup[0].id;
  }

  let [ewComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['EDLI Wages', ewGroupId]
  );
  if (ewComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'EDLI Wages', 'Derived', 0.00, '[EPF_EPS_WAGES];', 0, 0, 'Fixed', 1)`,
      [uuidv4(), orgId, ewGroupId]
    );
    console.log(`  └─ Created Component: "EDLI Wages" [Derived: [EPF_EPS_WAGES];] (ID: ${res.insertId})`);
  }

  // 2. Group: "EPF and EPS Diff"
  let [diffGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND category = \"Deduction\" AND deleted_at IS NULL',
    ['EPF and EPS Diff', orgId]
  );
  let diffGroupId;
  if (diffGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'EPF and EPS Diff', 'Deduction', 'Round', 'Max', 0, 0, 1, 'Employer', 1, 'Choose', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    diffGroupId = res.insertId;
    console.log(`\n✅ Created Deduction Group: "EPF and EPS Diff" (ID: ${diffGroupId})`);
  } else {
    diffGroupId = diffGroup[0].id;
  }

  let [diffComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['EPF and EPS Diff', diffGroupId]
  );
  if (diffComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'EPF and EPS Diff', 'Derived', 0.00, 'round([PF_EMPLOYEE] - [EPS_COMPONENT]);', 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, diffGroupId]
    );
    console.log(`  └─ Created Component: "EPF and EPS Diff" [Derived: round([PF_EMPLOYEE] - [EPS_COMPONENT]);] (ID: ${res.insertId})`);
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

seedEdliAndEpfDiff().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
