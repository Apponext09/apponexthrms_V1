const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function updateEsicAndAddMediclaim() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== UPDATING ESIC & ADDING GROUP MEDICLAIM ===\n');

  // 1. Update Component in Group "ESIC" to "ESIC Employee" (Module: ESIC Employee, Att: Yes)
  await conn.query(
    `UPDATE payroll_components 
     SET name = 'ESIC Employee',
         component_type = 'Module',
         module_source = 'ESIC Employee',
         formula = NULL,
         based_on_attendance = 1,
         boundary_type = 'Choose',
         is_active = 1
     WHERE group_id = (SELECT id FROM payroll_component_groups WHERE name = 'ESIC' AND organization_id = ? LIMIT 1)`,
    [orgId]
  );
  console.log('✅ Updated "ESIC" component -> Name: "ESIC Employee", Module: "ESIC Employee", Att: Yes');

  // 2. Group: "Group Mediclaim"
  let [medGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND category = \"Deduction\" AND deleted_at IS NULL',
    ['Group Mediclaim', orgId]
  );
  let medGroupId;
  if (medGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Group Mediclaim', 'Deduction', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Choose', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    medGroupId = res.insertId;
    console.log(`\n✅ Created Deduction Group: "Group Mediclaim" (ID: ${medGroupId})`);
  } else {
    medGroupId = medGroup[0].id;
  }

  let [medComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Mediclaim deduction', medGroupId]
  );
  if (medComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Mediclaim deduction', 'Value', 0.00, NULL, 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, medGroupId]
    );
    console.log(`  └─ Created Component: "Mediclaim deduction" [Value: 0.00] (ID: ${res.insertId})`);
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

updateEsicAndAddMediclaim().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
