const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function updateHraAndAddHraEarned() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== UPDATING HRA & ADDING HRA EARNED FROM SCREENSHOTS ===\n');

  // 1. Update Component "HRA" -> [BASIC]*0.4
  await conn.query(
    `UPDATE payroll_components 
     SET component_type = 'Derived',
         formula = '[BASIC]*0.4',
         based_on_attendance = 0,
         boundary_type = 'Choose',
         is_active = 1
     WHERE name = 'HRA' AND group_id = (SELECT id FROM payroll_component_groups WHERE name = 'HRA' AND organization_id = ? LIMIT 1)`,
    [orgId]
  );
  console.log('✅ Updated "HRA" -> Derived: [BASIC]*0.4');

  // 2. Update Component "HRA 25%" -> (25 * [CTC])/100, Active: 0
  await conn.query(
    `UPDATE payroll_components 
     SET component_type = 'Derived',
         formula = '(25 * [CTC])/100',
         based_on_attendance = 0,
         boundary_type = 'Choose',
         is_active = 0
     WHERE name = 'HRA 25%' AND group_id = (SELECT id FROM payroll_component_groups WHERE name = 'HRA' AND organization_id = ? LIMIT 1)`,
    [orgId]
  );
  console.log('✅ Updated "HRA 25%" -> Derived: (25 * [CTC])/100, Active: No');

  // 3. Group: "HRA Earned"
  let [hraeGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['HRA Earned', orgId]
  );
  let hraeGroupId;
  if (hraeGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'HRA Earned', 'Earning', 'Round', 'Max', 0, 0, 0, 'Employee', 1, 'Car Allowance', 0, 0, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    hraeGroupId = res.insertId;
    console.log(`\n✅ Created Group: "HRA Earned" (ID: ${hraeGroupId})`);
  } else {
    hraeGroupId = hraeGroup[0].id;
  }

  // Component inside HRA Earned: "Hra Earned"
  let [hraeComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Hra Earned', hraeGroupId]
  );
  if (hraeComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Hra Earned', 'Derived', 0.00, '[HRA]', 1, 0, 'Choose', 1)`,
      [uuidv4(), orgId, hraeGroupId]
    );
    console.log(`  └─ Created Component: "Hra Earned" [Derived: [HRA], Att: Yes, Active: Yes] (ID: ${res.insertId})`);
  } else {
    await conn.query(
      `UPDATE payroll_components 
       SET component_type = 'Derived',
           formula = '[HRA]',
           based_on_attendance = 1,
           is_active = 1
       WHERE id = ?`,
      [hraeComp[0].id]
    );
    console.log(`  └─ Updated Component: "Hra Earned" [Derived: [HRA], Att: Yes, Active: Yes]`);
  }

  // 4. Update Pay Slab
  const [activeComps] = await conn.query(
    'SELECT id FROM payroll_components WHERE organization_id = ? AND is_active = 1 AND deleted_at IS NULL ORDER BY id ASC',
    [orgId]
  );
  const compIds = activeComps.map(c => c.id);
  await conn.query('UPDATE payroll_slabs SET selected_component_ids = ? WHERE id = 2', [JSON.stringify(compIds)]);
  console.log('\n✅ Pay Slab #2 updated with active component IDs:', compIds);

  await conn.end();
  process.exit(0);
}

updateHraAndAddHraEarned().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
