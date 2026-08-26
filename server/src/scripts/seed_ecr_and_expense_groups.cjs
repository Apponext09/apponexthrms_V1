const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedEcrAndExpenseGroups() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== SEEDING ECR GROSS AMOUNT & EXPENSE REIMBURSEMENT GROUPS ===\n');

  // 1. Group: "ECR Gross Amount"
  let [ecrGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['ECR Gross Amount', orgId]
  );
  let ecrGroupId;
  if (ecrGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'ECR Gross Amount', 'Earning', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Car Allowance', 10, 1, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    ecrGroupId = res.insertId;
    console.log(`✅ Created Group: "ECR Gross Amount" (ID: ${ecrGroupId})`);
  } else {
    ecrGroupId = ecrGroup[0].id;
  }

  let [ecrComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['ECR Gross Amount', ecrGroupId]
  );
  if (ecrComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'ECR Gross Amount', 'Derived', 0.00, '[GROSS]', 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, ecrGroupId]
    );
    console.log(`  └─ Created Component: "ECR Gross Amount" [Derived: [GROSS], Att: No] (ID: ${res.insertId})`);
  }

  // 2. Group: "Expense Reimbursement"
  let [expGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Expense Reimbursement', orgId]
  );
  let expGroupId;
  if (expGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Expense Reimbursement', 'Earning', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Car Allowance', 10, 1, 0, 0, 0)`,
      [uuidv4(), orgId]
    );
    expGroupId = res.insertId;
    console.log(`\n✅ Created Group: "Expense Reimbursement" (ID: ${expGroupId})`);
  } else {
    expGroupId = expGroup[0].id;
  }

  let [expComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Expense Reimbursement', expGroupId]
  );
  if (expComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, module_source, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Expense Reimbursement', 'Module', 'Reimbursements', 0.00, NULL, 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, expGroupId]
    );
    console.log(`  └─ Created Component: "Expense Reimbursement" [Module: Reimbursements] (ID: ${res.insertId})`);
  }

  // 3. Update Pay Slab with all active components
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

seedEcrAndExpenseGroups().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
