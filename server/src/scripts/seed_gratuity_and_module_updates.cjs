const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedGratuityAndModuleUpdates() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== UPDATING EXPENSE REIMBURSEMENT MODULE & ADDING GRATUITY ===\n');

  // 1. Update Expense Reimbursement module_source
  await conn.query(
    `UPDATE payroll_components 
     SET component_type = 'Module',
         module_source = 'All Expense Reimbursements',
         amount = 0.00,
         based_on_attendance = 0,
         boundary_type = 'Choose',
         is_active = 1
     WHERE name = 'Expense Reimbursement'`
  );
  console.log('✅ Updated "Expense Reimbursement" -> Module: "All Expense Reimbursements"');

  // 2. Group: "Gratuity"
  let [gratGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Gratuity', orgId]
  );
  let gratGroupId;
  if (gratGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Gratuity', 'Earning', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Car Allowance', 10, 1, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    gratGroupId = res.insertId;
    console.log(`✅ Created Group: "Gratuity" (ID: ${gratGroupId})`);
  } else {
    gratGroupId = gratGroup[0].id;
  }

  let [gratComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Gratuity', gratGroupId]
  );
  if (gratComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Gratuity', 'Derived', 0.00, '([Basic Salary] * 15 * [Tenure_Years]) / 26', 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, gratGroupId]
    );
    console.log(`  └─ Created Component: "Gratuity" (ID: ${res.insertId})`);
  }

  // 3. Update Pay Slab
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

seedGratuityAndModuleUpdates().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
