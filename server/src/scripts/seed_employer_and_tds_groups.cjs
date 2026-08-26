const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedEmployerAndTdsGroups() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== SEEDING SAL DEDUCTION, TDS, ESIC EMPLOYER & PF EMPLOYER ===\n');

  // 1. Group: "Sal. Deduction"
  let [sdGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND category = "Deduction" AND deleted_at IS NULL',
    ['Sal. Deduction', orgId]
  );
  let sdGroupId = sdGroup.length ? sdGroup[0].id : null;
  if (!sdGroupId) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Sal. Deduction', 'Deduction', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Choose', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    sdGroupId = res.insertId;
  }
  let [sdComp] = await conn.query('SELECT id FROM payroll_components WHERE group_id = ? AND deleted_at IS NULL', [sdGroupId]);
  if (sdComp.length === 0) {
    await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Sal. Deduction', 'Value', 0.00, NULL, 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, sdGroupId]
    );
  }
  console.log('✅ Group "Sal. Deduction" -> Sal. Deduction (Value: 0.00)');

  // 2. Group: "TDS"
  let [tdsGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND category = "Deduction" AND deleted_at IS NULL',
    ['TDS', orgId]
  );
  let tdsGroupId = tdsGroup.length ? tdsGroup[0].id : null;
  if (!tdsGroupId) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'TDS', 'Deduction', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Choose', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    tdsGroupId = res.insertId;
  }
  let [tdsComp] = await conn.query('SELECT id FROM payroll_components WHERE group_id = ? AND deleted_at IS NULL', [tdsGroupId]);
  if (tdsComp.length === 0) {
    await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Tds', 'Value', 0.00, NULL, 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, tdsGroupId]
    );
  } else {
    await conn.query('UPDATE payroll_components SET name = "Tds", component_type = "Value", amount = 0.00, is_active = 1 WHERE id = ?', [tdsComp[0].id]);
  }
  console.log('✅ Group "TDS" -> Tds (Value: 0.00)');

  // 3. Group: "ESIC Employer"
  let [esiceGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND category = "Deduction" AND deleted_at IS NULL',
    ['ESIC Employer', orgId]
  );
  let esiceGroupId = esiceGroup.length ? esiceGroup[0].id : null;
  if (!esiceGroupId) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'ESIC Employer', 'Deduction', 'Round', 'Max', 0, 0, 1, 'Employer', 1, 'Choose', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    esiceGroupId = res.insertId;
  }
  let [esiceComp] = await conn.query('SELECT id FROM payroll_components WHERE group_id = ? AND deleted_at IS NULL', [esiceGroupId]);
  if (esiceComp.length === 0) {
    await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, module_source, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'ESIC Employer', 'Module', 'ESIC Employer', 0.00, NULL, 1, 0, 'Choose', 1)`,
      [uuidv4(), orgId, esiceGroupId]
    );
  } else {
    await conn.query('UPDATE payroll_components SET name = "ESIC Employer", component_type = "Module", module_source = "ESIC Employer", based_on_attendance = 1, is_active = 1 WHERE id = ?', [esiceComp[0].id]);
  }
  console.log('✅ Group "ESIC Employer" -> ESIC Employer (Module: ESIC Employer, Att: Yes)');

  // 4. Group: "PF Employer"
  let [pfeGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND category = "Deduction" AND deleted_at IS NULL',
    ['PF Employer', orgId]
  );
  let pfeGroupId = pfeGroup.length ? pfeGroup[0].id : null;
  if (!pfeGroupId) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'PF Employer', 'Deduction', 'Round', 'Max', 0, 0, 1, 'Employer', 1, 'Choose', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    pfeGroupId = res.insertId;
  }
  let [pfeComp] = await conn.query('SELECT id FROM payroll_components WHERE group_id = ? AND deleted_at IS NULL', [pfeGroupId]);
  if (pfeComp.length === 0) {
    await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, min_amount, max_amount, is_active)
       VALUES (?, ?, ?, 'PF Employer', 'Derived', 0.00, '(12 * [BASIC])/100', 1, 0, 'Fixed', 0.00, 1800.00, 1)`,
      [uuidv4(), orgId, pfeGroupId]
    );
  } else {
    await conn.query(
      `UPDATE payroll_components 
       SET name = 'PF Employer',
           component_type = 'Derived',
           formula = '(12 * [BASIC])/100',
           boundary_type = 'Fixed',
           min_amount = 0.00,
           max_amount = 1800.00,
           based_on_attendance = 1,
           is_active = 1
       WHERE id = ?`,
      [pfeComp[0].id]
    );
  }
  console.log('✅ Group "PF Employer" -> PF Employer [Derived: (12 * [BASIC])/100, Max: 1800, Att: Yes]');

  // 5. Update Pay Slab
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

seedEmployerAndTdsGroups().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
