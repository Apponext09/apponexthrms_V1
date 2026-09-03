const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedStandardAllowanceAndWeekoff() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== SEEDING STANDARD ALLOWANCE & WEEKOFF DOUBLE PAY GROUPS ===\n');

  // 1. Group: "Standard Allowance"
  let [stdGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Standard Allowance', orgId]
  );
  let stdGroupId;
  if (stdGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Standard Allowance', 'Earning', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Car Allowance', 10, 1, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    stdGroupId = res.insertId;
  } else {
    stdGroupId = stdGroup[0].id;
  }

  let [stdComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Standard Allowance', stdGroupId]
  );
  if (stdComp.length === 0) {
    await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Standard Allowance', 'Derived', 0.00, 'Comp1 + Comp2', 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, stdGroupId]
    );
  } else {
    await conn.query(
      `UPDATE payroll_components 
       SET component_type = 'Derived',
           formula = 'Comp1 + Comp2',
           based_on_attendance = 0,
           boundary_type = 'Choose',
           is_active = 1
       WHERE id = ?`,
      [stdComp[0].id]
    );
  }
  console.log('✅ Created/Updated "Standard Allowance" -> Derived: Comp1 + Comp2');

  // 2. Group: "Standard Allowance Earned"
  let [stdeGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Standard Allowance Earned', orgId]
  );
  let stdeGroupId;
  if (stdeGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Standard Allowance Earned', 'Earning', 'Round', 'Max', 0, 0, 0, 'Employee', 1, 'Car Allowance', 0, 0, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    stdeGroupId = res.insertId;
  } else {
    stdeGroupId = stdeGroup[0].id;
  }

  let [stdeComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Standard Allowance Earned', stdeGroupId]
  );
  if (stdeComp.length === 0) {
    await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Standard Allowance Earned', 'Derived', 0.00, '[STANDARD_ALLOWANCE]', 1, 0, 'Choose', 1)`,
      [uuidv4(), orgId, stdeGroupId]
    );
  } else {
    await conn.query(
      `UPDATE payroll_components 
       SET component_type = 'Derived',
           formula = '[STANDARD_ALLOWANCE]',
           based_on_attendance = 1,
           boundary_type = 'Choose',
           is_active = 1
       WHERE id = ?`,
      [stdeComp[0].id]
    );
  }
  console.log('✅ Created/Updated "Standard Allowance Earned" -> Derived: [STANDARD_ALLOWANCE]');

  // 3. Group: "Weekoff and Holiday Double Pay"
  let [whGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Weekoff and Holiday Double Pay', orgId]
  );
  let whGroupId;
  if (whGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Weekoff and Holiday Double Pay', 'Earning', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Car Allowance', 10, 1, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    whGroupId = res.insertId;
  } else {
    whGroupId = whGroup[0].id;
  }

  let [whComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Weekoff and Holiday Double Pay', whGroupId]
  );
  if (whComp.length === 0) {
    await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, module_source, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Weekoff and Holiday Double Pay', 'Module', 'Holidays Weekend Overtime', 0.00, NULL, 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, whGroupId]
    );
    console.log('✅ Created "Weekoff and Holiday Double Pay" [Module: Holidays Weekend Overtime]');
  }

  // 4. Update Pay Slab
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

seedStandardAllowanceAndWeekoff().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
