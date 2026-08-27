/**
 * fix_group_display_order.cjs
 * 
 * ISSUE FOUND: "Earned" groups (Basic Earned, HRA Earned etc) have display_order = 0
 * which means they render BEFORE "Basic" (order 1) and "HRA" (order 2).
 * This is a display issue only (formula evaluation uses component-level ordering),
 * but on payslip & UI it shows earned before base components.
 * 
 * Fix: Set all *Earned groups to display_order = 50+ so they render after their parents.
 * Also fix deduction groups to all display order = 100+ so deductions show after earnings.
 */
const mysql = require('mysql2/promise');

async function fixOrder() {
  const conn = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'root123', database: 'health'
  });
  const orgId = 8;

  console.log('=== FIXING GROUP DISPLAY ORDERS ===\n');

  // Step 1: Earning base components (non-earned) — order 10
  const [r1] = await conn.query(
    "UPDATE payroll_component_groups SET display_order = 10 WHERE organization_id = ? AND category = 'Earning' AND name NOT LIKE '%Earned%' AND deleted_at IS NULL",
    [orgId]
  );
  console.log('Step 1: Earnings (non-Earned) set to order 10 ->', r1.affectedRows, 'groups');

  // Step 2: Earned components — order 50 (so they render after their base)
  const [r2] = await conn.query(
    "UPDATE payroll_component_groups SET display_order = 50 WHERE organization_id = ? AND category = 'Earning' AND name LIKE '%Earned%' AND deleted_at IS NULL",
    [orgId]
  );
  console.log('Step 2: Earnings (Earned) set to order 50 ->', r2.affectedRows, 'groups');

  // Step 3: Deductions — order 100 (after all earnings)
  const [r3] = await conn.query(
    "UPDATE payroll_component_groups SET display_order = 100 WHERE organization_id = ? AND category = 'Deduction' AND deleted_at IS NULL",
    [orgId]
  );
  console.log('Step 3: Deductions set to order 100 ->', r3.affectedRows, 'groups');

  // Step 4: Specific critical groups must be ordered correctly for cascading
  // Basic (order 1) must come before HRA (order 2) which must come before others
  const specifics = [
    { name: 'Basic', order: 1 },
    { name: 'HRA', order: 2 },
    { name: 'Conveyance', order: 3 },
    { name: 'Conveyance Allowance', order: 4 },
    { name: 'Professional Allowance', order: 5 },
    { name: 'Medical Allowance', order: 6 },
    { name: 'Special Allowance', order: 90 },        // Residual — last earning
    { name: 'SPECIAL ALLOWANCE EARNED', order: 95 }, // After special allowance
    // Deduction ordering
    { name: 'EPF EPS Wages', order: 101 },           // Must be first deduction (others depend on it)
    { name: 'EPS Wages', order: 102 },
    { name: 'ESI Wages', order: 103 },
    { name: 'EPS Component', order: 104 },
    { name: 'ESIC', order: 105 },
    { name: 'PF', order: 106 },
    { name: 'EPF and EPS Diff', order: 107 },
    { name: 'EDLI Wages', order: 108 },
    { name: 'ADMIN CHARGES', order: 109 },
    { name: 'EDLI CHARGES', order: 110 },
    { name: 'PT', order: 111 },
    { name: 'TDS', order: 112 },
    { name: 'PF Employer', order: 120 },
    { name: 'ESIC Employer', order: 121 },
  ];

  for (const s of specifics) {
    const [r] = await conn.query(
      'UPDATE payroll_component_groups SET display_order = ? WHERE organization_id = ? AND name = ? AND deleted_at IS NULL',
      [s.order, orgId, s.name]
    );
    console.log(`  Group "${s.name}" -> order ${s.order} (${r.affectedRows} row)`);
  }

  // Verify
  console.log('\n=== FINAL GROUP ORDER ===');
  const [groups] = await conn.query(
    'SELECT id, name, category, display_order FROM payroll_component_groups WHERE organization_id = ? AND deleted_at IS NULL ORDER BY display_order ASC, id ASC',
    [orgId]
  );
  groups.forEach(g => console.log(`  ${String(g.display_order).padStart(3)}: [${g.category}] ${g.name}`));

  await conn.end();
  console.log('\n=== DONE ===');
  process.exit(0);
}

fixOrder().catch(e => { console.error(e); process.exit(1); });
