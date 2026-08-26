const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedConveyanceUpdates() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== UPDATING CONVEYANCE & CONVEYANCE ALLOWANCE GROUPS FROM SCREENSHOT ===\n');

  // 1. Update component inside Group 8 (Conveyance) to "Conveyance 25%"
  await conn.query(
    `UPDATE payroll_components 
     SET name = 'Conveyance 25%'
     WHERE group_id = (SELECT id FROM payroll_component_groups WHERE name = 'Conveyance' AND organization_id = ?)`,
    [orgId]
  );
  console.log('✅ Updated Component in Group "Conveyance" to "Conveyance 25%"');

  // 2. Add Group: "Conveyance Allowance"
  let [caGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Conveyance Allowance', orgId]
  );
  let caGroupId;
  if (caGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Conveyance Allowance', 'Earning', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Car Allowance', 10, 1, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    caGroupId = res.insertId;
    console.log(`✅ Created Group: "Conveyance Allowance" (ID: ${caGroupId})`);
  } else {
    caGroupId = caGroup[0].id;
  }

  // Component inside Conveyance Allowance: Conveyance Allowance
  let [caComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Conveyance Allowance', caGroupId]
  );
  if (caComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Conveyance Allowance', 'Value', 0.00, NULL, 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, caGroupId]
    );
    console.log(`  └─ Created Component: "Conveyance Allowance" [Value, 0.00] (ID: ${res.insertId})`);
  }

  // 3. Update Pay Slab 2 with all active components
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

seedConveyanceUpdates().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
