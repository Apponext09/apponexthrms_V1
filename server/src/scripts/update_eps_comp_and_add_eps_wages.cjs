const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function updateEpsCompAndAddEpsWages() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== UPDATING EPS COMPONENT & ADDING EPS WAGES ===\n');

  // 1. Update EPS Component formula & boundaries
  await conn.query(
    `UPDATE payroll_components 
     SET component_type = 'Derived',
         formula = 'round((8.33 / 100) * [EPF_EPS_WAGES])',
         boundary_type = 'Fixed',
         min_amount = 0.00,
         max_amount = 1250.00,
         based_on_attendance = 0,
         is_active = 1
     WHERE name = 'EPS Component'`
  );
  console.log('✅ Updated "EPS Component" -> Formula: round((8.33 / 100) * [EPF_EPS_WAGES]), Min: 0, Max: 1250');

  // 2. Group: "EPS Wages"
  let [ewGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND category = \"Deduction\" AND deleted_at IS NULL',
    ['EPS Wages', orgId]
  );
  let ewGroupId;
  if (ewGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'EPS Wages', 'Deduction', 'Round', 'Max', 0, 0, 1, 'Employer', 1, 'Choose', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    ewGroupId = res.insertId;
    console.log(`✅ Created Deduction Group: "EPS Wages" (ID: ${ewGroupId})`);
  } else {
    ewGroupId = ewGroup[0].id;
  }

  let [ewComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name LIKE \"%EPS wages%\" AND group_id = ? AND deleted_at IS NULL',
    [ewGroupId]
  );
  if (ewComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, min_amount, max_amount, is_active)
       VALUES (?, ?, ?, 'EPS wages', 'Derived', 0.00, '[EPF_EPS_WAGES]', 0, 0, 'Fixed', 0.00, 15000.00, 1)`,
      [uuidv4(), orgId, ewGroupId]
    );
    console.log(`  └─ Created Component: "EPS wages" (ID: ${res.insertId})`);
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

updateEpsCompAndAddEpsWages().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
