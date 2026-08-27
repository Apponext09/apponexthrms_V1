const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function updateLeaveSalaryAndAddLta() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== UPDATING LEAVE SALARY & ADDING LTA GROUP ===\n');

  // 1. First run the Leave Encashment update
  let [leGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Leave Encashment', orgId]
  );
  let leGroupId;
  if (leGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Leave Encashment', 'Earning', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Car Allowance', 10, 1, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    leGroupId = res.insertId;
  } else {
    leGroupId = leGroup[0].id;
  }

  let [leComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Leave Encashment', leGroupId]
  );
  if (leComp.length === 0) {
    await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, module_source, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Leave Encashment', 'Module', 'Leave Encash', 0.00, NULL, 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, leGroupId]
    );
  } else {
    await conn.query(
      `UPDATE payroll_components 
       SET component_type = 'Module',
           module_source = 'Leave Encash',
           formula = NULL,
           based_on_attendance = 0,
           boundary_type = 'Choose',
           is_active = 1
       WHERE id = ?`,
      [leComp[0].id]
    );
  }
  console.log('✅ Updated "Leave Encashment" -> Module: "Leave Encash"');

  // 2. Group: "Leave Salary" with is_active = 0
  let [lsGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Leave Salary', orgId]
  );
  let lsGroupId;
  if (lsGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Leave Salary', 'Earning', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Car Allowance', 10, 1, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    lsGroupId = res.insertId;
  } else {
    lsGroupId = lsGroup[0].id;
  }

  let [lsComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Leave Salary', lsGroupId]
  );
  if (lsComp.length === 0) {
    await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Leave Salary', 'Value', 0.00, NULL, 0, 0, 'Choose', 0)`,
      [uuidv4(), orgId, lsGroupId]
    );
  } else {
    await conn.query(
      `UPDATE payroll_components 
       SET component_type = 'Value',
           amount = 0.00,
           formula = NULL,
           based_on_attendance = 0,
           boundary_type = 'Choose',
           is_active = 0
       WHERE id = ?`,
      [lsComp[0].id]
    );
  }
  console.log('✅ Updated "Leave Salary" -> Value: 0.00, Active: No');

  // 3. Group: "LTA" (LTA Allowance)
  let [ltaGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['LTA', orgId]
  );
  let ltaGroupId;
  if (ltaGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'LTA', 'Earning', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Car Allowance', 10, 1, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    ltaGroupId = res.insertId;
    console.log(`\n✅ Created Group: "LTA" (ID: ${ltaGroupId})`);
  } else {
    ltaGroupId = ltaGroup[0].id;
  }

  let [ltaComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['LTA Allowance', ltaGroupId]
  );
  if (ltaComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'LTA Allowance', 'Derived', 0.00, '[BASIC] * 0.0833', 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, ltaGroupId]
    );
    console.log(`  └─ Created Component: "LTA Allowance" (ID: ${res.insertId})`);
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

updateLeaveSalaryAndAddLta().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
