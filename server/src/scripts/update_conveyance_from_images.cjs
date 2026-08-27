const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function updateConveyanceFromImages() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== UPDATING CONVEYANCE & CONVEYANCE ALLOWANCE FROM SCREENSHOTS ===\n');

  // 1. Group: "Conveyance" -> Component: "Conveyance 25%" (Formula: [BASIC]*0.20)
  await conn.query(
    `UPDATE payroll_components 
     SET component_type = 'Derived',
         formula = '[BASIC]*0.20',
         amount = 0.00,
         based_on_attendance = 0,
         non_cashable = 0,
         boundary_type = 'Choose',
         is_active = 1
     WHERE name = 'Conveyance 25%'`
  );
  console.log('✅ 1. "Conveyance 25%" updated -> Derived: [BASIC]*0.20');

  // 2. Group: "Conveyance Allowance" -> Component: "Conveyance Allowance" (Formula: (5 * [CTC])/100)
  await conn.query(
    `UPDATE payroll_components 
     SET component_type = 'Derived',
         formula = '(5 * [CTC])/100',
         amount = 0.00,
         based_on_attendance = 0,
         non_cashable = 0,
         boundary_type = 'Choose',
         is_active = 1
     WHERE name = 'Conveyance Allowance'`
  );
  console.log('✅ 2. "Conveyance Allowance" updated -> Derived: (5 * [CTC])/100');

  // 3. Group: "Conveyance Allowance Earned" -> Component: "Conveyance Allowance Earned" (Formula: [CONVEYANCE_ALLOWANCE], Att: Yes)
  let [caeGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Conveyance Allowance Earned', orgId]
  );
  let caeGroupId;
  if (caeGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Conveyance Allowance Earned', 'Earning', 'Round', 'Max', 0, 0, 0, 'Employee', 1, 'Car Allowance', 0, 0, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    caeGroupId = res.insertId;
  } else {
    caeGroupId = caeGroup[0].id;
  }

  let [caeComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Conveyance Allowance Earned', caeGroupId]
  );
  if (caeComp.length === 0) {
    await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, is_active)
       VALUES (?, ?, ?, 'Conveyance Allowance Earned', 'Derived', 0.00, '[CONVEYANCE_ALLOWANCE]', 1, 0, 1)`,
      [uuidv4(), orgId, caeGroupId]
    );
  } else {
    await conn.query(
      `UPDATE payroll_components 
       SET component_type = 'Derived',
           formula = '[CONVEYANCE_ALLOWANCE]',
           based_on_attendance = 1,
           is_active = 1
       WHERE id = ?`,
      [caeComp[0].id]
    );
  }
  console.log('✅ 3. "Conveyance Allowance Earned" updated -> Derived: [CONVEYANCE_ALLOWANCE], Attendance: Yes');

  // Update Pay Slab with active components
  const [activeComps] = await conn.query(
    'SELECT id FROM payroll_components WHERE organization_id = ? AND is_active = 1 AND deleted_at IS NULL ORDER BY id ASC',
    [orgId]
  );
  const compIds = activeComps.map(c => c.id);
  await conn.query('UPDATE payroll_slabs SET selected_component_ids = ? WHERE id = 2', [JSON.stringify(compIds)]);
  console.log('\n✅ Pay Slab #2 updated with active component IDs:', compIds);

  const [allComps] = await conn.query(
    `SELECT c.id, g.name as group_name, c.name, c.component_type, c.formula, c.based_on_attendance, c.is_active 
     FROM payroll_components c 
     JOIN payroll_component_groups g ON c.group_id = g.id 
     WHERE c.deleted_at IS NULL ORDER BY g.id, c.id`
  );
  console.table(allComps);

  await conn.end();
  process.exit(0);
}

updateConveyanceFromImages().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
