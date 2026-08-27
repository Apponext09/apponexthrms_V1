const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedDeductionsBatch1() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== SEEDING DEDUCTION GROUPS BATCH 1 FROM SCREENSHOTS ===\n');

  // 1. Group: "ADMIN CHARGES"
  let [acGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND category = \"Deduction\" AND deleted_at IS NULL',
    ['ADMIN CHARGES', orgId]
  );
  let acGroupId;
  if (acGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'ADMIN CHARGES', 'Deduction', 'Round', 'Max', 0, 0, 1, 'Employer', 1, 'Choose', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    acGroupId = res.insertId;
    console.log(`✅ Created Deduction Group: "ADMIN CHARGES" (ID: ${acGroupId})`);
  } else {
    acGroupId = acGroup[0].id;
  }

  let [acComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Admin Charges', acGroupId]
  );
  if (acComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Admin Charges', 'Derived', 0.00, '[EPF_EPS_WAGES] * 0.005', 0, 0, 'Fixed', 1)`,
      [uuidv4(), orgId, acGroupId]
    );
    console.log(`  └─ Created Component: "Admin Charges" [Derived: [EPF_EPS_WAGES] * 0.005] (ID: ${res.insertId})`);
  }

  // 2. Group: "Early Deduction"
  let [edGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND category = \"Deduction\" AND deleted_at IS NULL',
    ['Early Deduction', orgId]
  );
  let edGroupId;
  if (edGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Early Deduction', 'Deduction', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Choose', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    edGroupId = res.insertId;
    console.log(`\n✅ Created Deduction Group: "Early Deduction" (ID: ${edGroupId})`);
  } else {
    edGroupId = edGroup[0].id;
  }

  let [edComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Early Deduction', edGroupId]
  );
  if (edComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, module_source, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Early Deduction', 'Module', 'Early Deduction', 0.00, NULL, 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, edGroupId]
    );
    console.log(`  └─ Created Component: "Early Deduction" [Module: Early Deduction] (ID: ${res.insertId})`);
  }

  // 3. Group: "EDLI CHARGES"
  let [edliGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND category = \"Deduction\" AND deleted_at IS NULL',
    ['EDLI CHARGES', orgId]
  );
  let edliGroupId;
  if (edliGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'EDLI CHARGES', 'Deduction', 'Round', 'Max', 0, 0, 1, 'Employer', 1, 'Choose', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    edliGroupId = res.insertId;
    console.log(`\n✅ Created Deduction Group: "EDLI CHARGES" (ID: ${edliGroupId})`);
  } else {
    edliGroupId = edliGroup[0].id;
  }

  let [edliComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['EDLI Charges', edliGroupId]
  );
  if (edliComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'EDLI Charges', 'Derived', 0.00, '[EPF_EPS_WAGES] * 0.005', 0, 0, 'Fixed', 1)`,
      [uuidv4(), orgId, edliGroupId]
    );
    console.log(`  └─ Created Component: "EDLI Charges" [Derived: [EPF_EPS_WAGES] * 0.005] (ID: ${res.insertId})`);
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

seedDeductionsBatch1().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
