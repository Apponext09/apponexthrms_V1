const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function updateEsiWagesAndAddEsic() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== UPDATING ESI WAGES & ADDING ESIC GROUP ===\n');

  // 1. Update Component inside Group "ESI Wages" to "ESI 75%" with formula ([SALARY_INPUT]-[CONVEYANCE])*0.75
  await conn.query(
    `UPDATE payroll_components 
     SET name = 'ESI 75%',
         component_type = 'Derived',
         formula = '([SALARY_INPUT]-[CONVEYANCE])*0.75',
         boundary_type = 'Choose',
         based_on_attendance = 0,
         is_active = 1
     WHERE group_id = (SELECT id FROM payroll_component_groups WHERE name = 'ESI Wages' AND organization_id = ? LIMIT 1)`,
    [orgId]
  );
  console.log('✅ Updated "ESI Wages" component -> Name: "ESI 75%", Formula: ([SALARY_INPUT]-[CONVEYANCE])*0.75');

  // 2. Group: "ESIC"
  let [esicGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND category = \"Deduction\" AND deleted_at IS NULL',
    ['ESIC', orgId]
  );
  let esicGroupId;
  if (esicGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'ESIC', 'Deduction', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Choose', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    esicGroupId = res.insertId;
    console.log(`\n✅ Created Deduction Group: "ESIC" (ID: ${esicGroupId})`);
  } else {
    esicGroupId = esicGroup[0].id;
  }

  let [esicComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['ESIC', esicGroupId]
  );
  if (esicComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'ESIC', 'Derived', 0.00, 'ceil(([ESI_WAGES] * 0.75)/100);', 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, esicGroupId]
    );
    console.log(`  └─ Created Component: "ESIC" (ID: ${res.insertId})`);
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

updateEsiWagesAndAddEsic().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
