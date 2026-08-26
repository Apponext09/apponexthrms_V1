const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedDeductionsFullBatch() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== SEEDING FULL DEDUCTION BATCH FROM SCREENSHOTS ===\n');

  // 1. Group: "Group Mediclaim"
  let [gmGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND category = "Deduction" AND deleted_at IS NULL',
    ['Group Mediclaim', orgId]
  );
  let gmGroupId = gmGroup.length ? gmGroup[0].id : null;
  if (!gmGroupId) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Group Mediclaim', 'Deduction', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Choose', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    gmGroupId = res.insertId;
  }
  let [gmComp] = await conn.query('SELECT id FROM payroll_components WHERE group_id = ? AND deleted_at IS NULL', [gmGroupId]);
  if (gmComp.length === 0) {
    await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Mediclaim deduction', 'Value', 350.00, NULL, 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, gmGroupId]
    );
  } else {
    await conn.query('UPDATE payroll_components SET name = "Mediclaim deduction", component_type = "Value", amount = 350.00, is_active = 1 WHERE id = ?', [gmComp[0].id]);
  }
  console.log('✅ Group Mediclaim -> Mediclaim deduction (Value: 350.00)');

  // 2. Group: "Late Deduction"
  let [ldGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND category = "Deduction" AND deleted_at IS NULL',
    ['Late Deduction', orgId]
  );
  let ldGroupId = ldGroup.length ? ldGroup[0].id : null;
  if (!ldGroupId) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Late Deduction', 'Deduction', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Choose', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    ldGroupId = res.insertId;
  }
  let [ldComp] = await conn.query('SELECT id FROM payroll_components WHERE group_id = ? AND deleted_at IS NULL', [ldGroupId]);
  if (ldComp.length === 0) {
    await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, module_source, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Late Deduction', 'Module', 'Late Deduction', 0.00, NULL, 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, ldGroupId]
    );
  }
  console.log('✅ Late Deduction -> Module: Late Deduction');

  // 3. Group: "Loan"
  let [loanGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND category = "Deduction" AND deleted_at IS NULL',
    ['Loan', orgId]
  );
  let loanGroupId = loanGroup.length ? loanGroup[0].id : null;
  if (!loanGroupId) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Loan', 'Deduction', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Choose', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    loanGroupId = res.insertId;
  }
  let [loanComp] = await conn.query('SELECT id FROM payroll_components WHERE group_id = ? AND deleted_at IS NULL', [loanGroupId]);
  if (loanComp.length === 0) {
    await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, module_source, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Loan', 'Module', 'Loan', 0.00, NULL, 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, loanGroupId]
    );
  }
  console.log('✅ Loan -> Module: Loan');

  // 4. Group: "LOP"
  let [lopGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND category = "Deduction" AND deleted_at IS NULL',
    ['LOP', orgId]
  );
  let lopGroupId = lopGroup.length ? lopGroup[0].id : null;
  if (!lopGroupId) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'LOP', 'Deduction', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Choose', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    lopGroupId = res.insertId;
  }
  let [lopComp] = await conn.query('SELECT id FROM payroll_components WHERE group_id = ? AND deleted_at IS NULL', [lopGroupId]);
  if (lopComp.length === 0) {
    await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, module_source, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Loss of Pay', 'Module', 'Loss of pay count', 0.00, NULL, 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, lopGroupId]
    );
  }
  console.log('✅ LOP -> Loss of Pay (Module: Loss of pay count)');

  // 5. Group: "PF"
  let [pfGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND category = "Deduction" AND deleted_at IS NULL',
    ['PF', orgId]
  );
  let pfGroupId = pfGroup.length ? pfGroup[0].id : null;
  if (!pfGroupId) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'PF', 'Deduction', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Choose', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    pfGroupId = res.insertId;
  }
  // Add PF components:
  // a) November 2019 onwards (Inactive, Derived: ([BASIC_EARNED]) * 0.16)
  let [pfComp1] = await conn.query('SELECT id FROM payroll_components WHERE name = "November 2019 onwards" AND group_id = ?', [pfGroupId]);
  if (pfComp1.length === 0) {
    await conn.query(
      `INSERT INTO payroll_components (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'November 2019 onwards', 'Derived', 0.00, '([BASIC_EARNED]) * 0.16', 0, 0, 'Fixed', 0)`,
      [uuidv4(), orgId, pfGroupId]
    );
  }
  // b) PF 12% on Basic (Active, Derived: ([BASIC_EARNED]) * 0.12)
  let [pfComp2] = await conn.query('SELECT id FROM payroll_components WHERE name = "PF 12% on Basic" AND group_id = ?', [pfGroupId]);
  if (pfComp2.length === 0) {
    await conn.query(
      `INSERT INTO payroll_components (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'PF 12% on Basic', 'Derived', 0.00, '([BASIC_EARNED]) * 0.12', 0, 0, 'Fixed', 1)`,
      [uuidv4(), orgId, pfGroupId]
    );
  }
  // c) PF Employee (Active, Derived: [BASIC_EARNED] * 0.12)
  let [pfComp3] = await conn.query('SELECT id FROM payroll_components WHERE name = "PF Employee" AND group_id = ?', [pfGroupId]);
  if (pfComp3.length === 0) {
    await conn.query(
      `INSERT INTO payroll_components (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'PF Employee', 'Derived', 0.00, '[BASIC_EARNED] * 0.12', 0, 0, 'Fixed', 0)`,
      [uuidv4(), orgId, pfGroupId]
    );
  }
  console.log('✅ PF Group -> November 2019 onwards, PF 12% on Basic, PF Employee');

  // 6. Group: "PT" (Professional Tax)
  let [ptGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND category = "Deduction" AND deleted_at IS NULL',
    ['PT', orgId]
  );
  let ptGroupId = ptGroup.length ? ptGroup[0].id : null;
  if (!ptGroupId) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'PT', 'Deduction', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Choose', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    ptGroupId = res.insertId;
  }

  // Add PT slab component: Kerala Rs.10000 to Rs.12499 (Value: 100.00)
  let [ptComp1] = await conn.query('SELECT id FROM payroll_components WHERE name = "Kerala Rs.10000 to Rs.12499" AND group_id = ?', [ptGroupId]);
  let ptComp1Id;
  if (ptComp1.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Kerala Rs.10000 to Rs.12499', 'Value', 100.00, NULL, 0, 0, 'Choose', 0)`,
      [uuidv4(), orgId, ptGroupId]
    );
    ptComp1Id = res.insertId;
  } else {
    ptComp1Id = ptComp1[0].id;
  }

  // Add PT standard Active component (e.g. Standard PT 200.00)
  let [ptCompMain] = await conn.query('SELECT id FROM payroll_components WHERE name = "Professional Tax" AND group_id = ?', [ptGroupId]);
  if (ptCompMain.length === 0) {
    await conn.query(
      `INSERT INTO payroll_components (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Professional Tax', 'Value', 200.00, NULL, 0, 0, 'Fixed', 1)`,
      [uuidv4(), orgId, ptGroupId]
    );
  }
  console.log('✅ PT Group -> Kerala slabs & Standard Professional Tax');

  // Update Pay Slab with active components
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

seedDeductionsFullBatch().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
