const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function updateGratuityAndAddHra() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== UPDATING GRATUITY & ADDING HRA GROUP WITH 2 COMPONENTS ===\n');

  // 1. Update Gratuity to Value: 0.00
  await conn.query(
    `UPDATE payroll_components 
     SET component_type = 'Value',
         amount = 0.00,
         formula = NULL,
         based_on_attendance = 0,
         boundary_type = 'Choose',
         is_active = 1
     WHERE name = 'Gratuity'`
  );
  console.log('✅ Updated "Gratuity" -> Value: 0.00, Attendance: No');

  // 2. Group: "HRA"
  let [hraGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['HRA', orgId]
  );
  let hraGroupId;
  if (hraGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'HRA', 'Earning', 'Round', 'Max', 1, 1, 0, 'Employee', 1, 'Choose', 2, 0, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    hraGroupId = res.insertId;
    console.log(`✅ Created Group: "HRA" (ID: ${hraGroupId})`);
  } else {
    hraGroupId = hraGroup[0].id;
  }

  // Component 1 inside HRA: "HRA"
  let [hra1] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['HRA', hraGroupId]
  );
  if (hra1.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'HRA', 'Derived', 0.00, '(40 * [BASIC])/100', 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, hraGroupId]
    );
    console.log(`  └─ Created Component: "HRA" (ID: ${res.insertId})`);
  }

  // Component 2 inside HRA: "HRA 25%"
  let [hra2] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['HRA 25%', hraGroupId]
  );
  if (hra2.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'HRA 25%', 'Derived', 0.00, '(25 * [BASIC])/100', 0, 0, 'Choose', 0)`,
      [uuidv4(), orgId, hraGroupId]
    );
    console.log(`  └─ Created Component: "HRA 25%" (ID: ${res.insertId})`);
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

updateGratuityAndAddHra().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
