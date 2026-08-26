const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function setupComponents() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== 1. SETTING UP OVERTIME (OT) ===');
  let [otGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Overtime Allowance', orgId]
  );
  let otGroupId;
  if (otGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups (uuid, organization_id, name, category, round_format, group_function, is_editable, contributed_by, is_active, display_order, is_taxable)
       VALUES (?, ?, 'Overtime Allowance', 'Earning', 'Round', 'Sum', 1, 'Employee', 1, 23, 1)`,
      [uuidv4(), orgId]
    );
    otGroupId = res.insertId;
    console.log('✅ Created Group: Overtime Allowance ID:', otGroupId);
  } else {
    otGroupId = otGroup[0].id;
    console.log('Existing Overtime Group ID:', otGroupId);
  }

  let [otComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Overtime Pay', orgId]
  );
  if (otComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components (uuid, organization_id, group_id, name, component_type, module_source, formula, amount, based_on_attendance, is_active)
       VALUES (?, ?, ?, 'Overtime Pay', 'Module', 'Overtime', '([Basic Salary] / 240) * 2 * [Overtime_Hours]', 0, 0, 1)`,
      [uuidv4(), orgId, otGroupId]
    );
    console.log('✅ Created Component: Overtime Pay ID:', res.insertId);
  } else {
    await conn.query(
      'UPDATE payroll_components SET group_id = ?, component_type = ?, module_source = ?, formula = ?, is_active = 1, deleted_at = NULL WHERE id = ?',
      [otGroupId, 'Module', 'Overtime', '([Basic Salary] / 240) * 2 * [Overtime_Hours]', otComp[0].id]
    );
    console.log('✅ Updated Component: Overtime Pay ID:', otComp[0].id);
  }

  console.log('\n=== 2. SETTING UP LEAVE ENCASHMENT ===');
  let [leGroup] = await conn.query(
    'SELECT id FROM payroll_component_groups WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Leave Encashment', orgId]
  );
  let leGroupId;
  if (leGroup.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_component_groups (uuid, organization_id, name, category, round_format, group_function, is_editable, contributed_by, is_active, display_order, is_taxable)
       VALUES (?, ?, 'Leave Encashment', 'Earning', 'Round', 'Sum', 1, 'Employee', 1, 24, 1)`,
      [uuidv4(), orgId]
    );
    leGroupId = res.insertId;
    console.log('✅ Created Group: Leave Encashment ID:', leGroupId);
  } else {
    leGroupId = leGroup[0].id;
    console.log('Existing Leave Encashment Group ID:', leGroupId);
  }

  let [leComp] = await conn.query(
    'SELECT id FROM payroll_components WHERE name = ? AND organization_id = ? AND deleted_at IS NULL',
    ['Leave Encashment', orgId]
  );
  if (leComp.length === 0) {
    const [res] = await conn.query(
      `INSERT INTO payroll_components (uuid, organization_id, group_id, name, component_type, module_source, formula, amount, based_on_attendance, is_active)
       VALUES (?, ?, ?, 'Leave Encashment', 'Module', 'Leave Encashment', '([Basic Salary] / 30) * [Encashed_Days]', 0, 0, 1)`,
      [uuidv4(), orgId, leGroupId]
    );
    console.log('✅ Created Component: Leave Encashment ID:', res.insertId);
  } else {
    await conn.query(
      'UPDATE payroll_components SET group_id = ?, component_type = ?, module_source = ?, formula = ?, is_active = 1, deleted_at = NULL WHERE id = ?',
      [leGroupId, 'Module', 'Leave Encashment', '([Basic Salary] / 30) * [Encashed_Days]', leComp[0].id]
    );
    console.log('✅ Updated Component: Leave Encashment ID:', leComp[0].id);
  }

  console.log('\n=== 3. SETTING UP LOSS OF PAY (LOP) ===');
  await conn.query(
    `UPDATE payroll_components 
     SET component_type = 'Module', 
         module_source = 'Loss of Pay', 
         formula = '([Gross] / 30) * [LOP_Days]',
         is_active = 1,
         deleted_at = NULL
     WHERE id = 31 OR name LIKE '%Loss of Pay%'`
  );
  console.log('✅ Updated Loss of Pay (LOP) Component');

  console.log('\n=== 4. SYNCING PAY SLAB ===');
  const [allActiveComps] = await conn.query(
    'SELECT id FROM payroll_components WHERE organization_id = ? AND is_active = 1 AND deleted_at IS NULL ORDER BY id ASC',
    [orgId]
  );
  const allCompIds = allActiveComps.map(c => c.id);
  await conn.query(
    'UPDATE payroll_slabs SET selected_component_ids = ? WHERE id = 2',
    [JSON.stringify(allCompIds)]
  );
  console.log(`✅ Standard Monthly Salary Slab updated with ${allCompIds.length} components.`);

  console.log('\n=== 5. FINAL VERIFICATION ===');
  const [targetComps] = await conn.query(
    `SELECT c.id, c.name, c.component_type, c.module_source, c.formula, g.name as group_name, g.category 
     FROM payroll_components c 
     JOIN payroll_component_groups g ON c.group_id = g.id 
     WHERE c.name IN ('Overtime Pay', 'Leave Encashment', 'Loss of Pay') AND c.deleted_at IS NULL`
  );
  console.table(targetComps);

  await conn.end();
  process.exit(0);
}

setupComponents().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
