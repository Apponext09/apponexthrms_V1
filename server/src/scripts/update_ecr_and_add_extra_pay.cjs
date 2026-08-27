const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function updateEcrAndAddExtraPay() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== UPDATING ECR GROSS AMOUNT & ADDING EXTRA PAY AMOUNT ===\n');

  // 1. Update ECR Gross Amount formula to [GROSS_EARNED]
  await conn.query(
    `UPDATE payroll_components 
     SET formula = '[GROSS_EARNED]',
         component_type = 'Derived',
         based_on_attendance = 0,
         boundary_type = 'Choose',
         is_active = 1
     WHERE name = 'ECR Gross Amount'`
  );
  console.log('✅ Updated "ECR Gross Amount" formula to [GROSS_EARNED]');

  // 2. Group: "Extra Pay Amount"
  let [extraGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Extra Pay Amount', orgId]
  );
  let extraGroupId;
  if (extraGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Extra Pay Amount', 'Earning', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Car Allowance', 10, 1, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    extraGroupId = res.insertId;
    console.log(`✅ Created Group: "Extra Pay Amount" (ID: ${extraGroupId})`);
  } else {
    extraGroupId = extraGroup[0].id;
  }

  let [extraComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Extra Pay Amount', extraGroupId]
  );
  if (extraComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Extra Pay Amount', 'Value', 0.00, NULL, 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, extraGroupId]
    );
    console.log(`  └─ Created Component: "Extra Pay Amount" [Value, 0.00] (ID: ${res.insertId})`);
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

updateEcrAndAddExtraPay().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
