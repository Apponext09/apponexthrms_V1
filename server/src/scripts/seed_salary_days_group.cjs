const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedSalaryDaysGroup() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== SEEDING SALARY DAYS GROUP FROM SCREENSHOT ===\n');

  // 1. Group: "Salary Days"
  let [sdGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Salary Days', orgId]
  );
  let sdGroupId;
  if (sdGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Salary Days', 'Earning', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Car Allowance', 10, 1, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    sdGroupId = res.insertId;
    console.log(`✅ Created Group: "Salary Days" (ID: ${sdGroupId})`);
  } else {
    sdGroupId = sdGroup[0].id;
  }

  let [sdComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Salary Days', sdGroupId]
  );
  if (sdComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, module_source, amount, formula, based_on_attendance, non_cashable, boundary_type, min_amount, max_amount, is_active)
       VALUES (?, ?, ?, 'Salary Days', 'Module', 'Salary Days', 0.00, NULL, 0, 0, 'Fixed', 0.00, 0.00, 1)`,
      [uuidv4(), orgId, sdGroupId]
    );
    console.log(`  └─ Created Component: "Salary Days" [Module: Salary Days, Boundary: Fixed] (ID: ${res.insertId})`);
  } else {
    await conn.query(
      `UPDATE payroll_components 
       SET component_type = 'Module',
           module_source = 'Salary Days',
           boundary_type = 'Fixed',
           min_amount = 0.00,
           max_amount = 0.00,
           based_on_attendance = 0,
           is_active = 1
       WHERE id = ?`,
      [sdComp[0].id]
    );
  }

  // 2. Update Pay Slab
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

seedSalaryDaysGroup().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
