const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seedSpecialAllowanceGroups() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== SEEDING SPECIAL ALLOWANCE & EARNED GROUPS ===\n');

  // 1. Group: "Special Allowance"
  let [saGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Special Allowance', orgId]
  );
  let saGroupId;
  if (saGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'Special Allowance', 'Earning', 'Round', 'Max', 0, 0, 1, 'Employee', 1, 'Car Allowance', 10, 1, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    saGroupId = res.insertId;
    console.log(`✅ Created Group: "Special Allowance" (ID: ${saGroupId})`);
  } else {
    saGroupId = saGroup[0].id;
  }

  let [saComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['Special allowance', saGroupId]
  );
  if (saComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'Special allowance', 'Derived', 0.00, '[SALARY_INPUT]-([BASIC]+[HRA]+[CONVEYANCE])', 0, 0, 'Choose', 1)`,
      [uuidv4(), orgId, saGroupId]
    );
    console.log(`  └─ Created Component: "Special allowance" [Derived: [SALARY_INPUT]-([BASIC]+[HRA]+[CONVEYANCE])] (ID: ${res.insertId})`);
  } else {
    await conn.query(
      `UPDATE payroll_components 
       SET component_type = 'Derived',
           formula = '[SALARY_INPUT]-([BASIC]+[HRA]+[CONVEYANCE])',
           based_on_attendance = 0,
           boundary_type = 'Choose',
           is_active = 1
       WHERE id = ?`,
      [saComp[0].id]
    );
  }

  // 2. Group: "SPECIAL ALLOWANCE EARNED"
  let [saeGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['SPECIAL ALLOWANCE EARNED', orgId]
  );
  let saeGroupId;
  if (saeGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups 
        (uuid, organization_id, name, category, round_format, group_function, configure_on_profile, display_on_profile, is_editable, contributed_by, is_active, group_for_payslip, display_order, disable_arrear, display_total_on_process, tds_same_month, is_taxable)
       VALUES (?, ?, 'SPECIAL ALLOWANCE EARNED', 'Earning', 'Round', 'Max', 0, 0, 0, 'Employee', 1, 'Car Allowance', 0, 0, 0, 0, 1)`,
      [uuidv4(), orgId]
    );
    saeGroupId = res.insertId;
    console.log(`\n✅ Created Group: "SPECIAL ALLOWANCE EARNED" (ID: ${saeGroupId})`);
  } else {
    saeGroupId = saeGroup[0].id;
  }

  let [saeComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND group_id = ? AND deleted_at IS NULL',
    ['SPECIAL ALLOWANCE EARNED', saeGroupId]
  );
  if (saeComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components 
        (uuid, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, non_cashable, boundary_type, is_active)
       VALUES (?, ?, ?, 'SPECIAL ALLOWANCE EARNED', 'Derived', 0.00, '[SPECIAL_ALLOWANCE]', 1, 0, 'Choose', 1)`,
      [uuidv4(), orgId, saeGroupId]
    );
    console.log(`  └─ Created Component: "SPECIAL ALLOWANCE EARNED" [Derived: [SPECIAL_ALLOWANCE], Att: Yes] (ID: ${res.insertId})`);
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

seedSpecialAllowanceGroups().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
