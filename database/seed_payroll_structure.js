/**
 * seed_payroll_structure.js
 * ─────────────────────────────────────────────────────────────
 * Seeds the correct Indian payroll group + component structure.
 * 10 focused groups, each with specific settings and components.
 * Components seeded with empty formulas — configure via UI.
 *
 * Run:  node database/seed_payroll_structure.js
 * ─────────────────────────────────────────────────────────────
 */

const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host:               'localhost',
  port:               3306,
  user:               'root',
  password:           'root123',
  database:           'health',
  multipleStatements: false,
};

const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;
const cyan   = (s) => `\x1b[36m${s}\x1b[0m`;

async function q(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  return rows;
}

async function main() {
  console.log(bold('\n══════════════════════════════════════════════════════════'));
  console.log(bold(' Indian Payroll Structure Seed — 10 Groups + Components'));
  console.log(bold('══════════════════════════════════════════════════════════\n'));

  const conn = await mysql.createConnection(DB_CONFIG);
  console.log(green('✅ Connected to MySQL → health\n'));

  // ── Step 1: Clear existing data ────────────────────────────
  console.log(bold('─── Clearing existing data ───────────────────────────\n'));
  await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
  await conn.execute('DELETE FROM `payroll_slab_components`');
  await conn.execute('DELETE FROM `payroll_components`');
  await conn.execute('DELETE FROM `payroll_component_groups`');
  await conn.execute('ALTER TABLE `payroll_component_groups` AUTO_INCREMENT = 1');
  await conn.execute('ALTER TABLE `payroll_components` AUTO_INCREMENT = 1');
  await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
  console.log(green('  ✅ Cleared all existing groups and components\n'));

  // ── Step 2: Define Groups ──────────────────────────────────
  // Fields: name, category, round_format, group_function,
  //         configure_on_profile, display_on_profile, is_editable,
  //         contributed_by, is_taxable, group_for_payslip,
  //         display_order, is_non_cashable (via components)
  //
  // Earning category → shows in earnings section of payslip
  // Deduction category → deducted from gross → reduces net pay

  const groups = [
    // ── EARNING GROUPS ────────────────────────────────────────
    {
      name:                    'Basic Pay',
      category:                'Earning',
      round_format:            'Round',
      group_function:          'Sum',
      configure_on_profile:    1,   // HR can override amount on employee profile
      display_on_profile:      1,   // Shows on employee salary profile
      is_editable:             1,
      contributed_by:          'Employee',
      is_taxable:              1,   // Basic is fully taxable
      group_for_payslip:       'Basic Pay',
      display_order:           1,
      disable_arrear:          0,
      display_total_on_process:1,
      tds_same_month:          0,
    },
    {
      name:                    'House Rent Allowance',
      category:                'Earning',
      round_format:            'Round',
      group_function:          'Sum',
      configure_on_profile:    1,
      display_on_profile:      1,
      is_editable:             1,
      contributed_by:          'Employee',
      is_taxable:              0,   // HRA is partially tax-exempt under Sec 10(13A)
      group_for_payslip:       'Allowances',
      display_order:           2,
      disable_arrear:          0,
      display_total_on_process:1,
      tds_same_month:          0,
    },
    {
      name:                    'Statutory Allowances',
      category:                'Earning',
      round_format:            'Round',
      group_function:          'Sum',
      configure_on_profile:    0,   // Fixed amounts — not per-employee configurable
      display_on_profile:      1,
      is_editable:             0,
      contributed_by:          'Employee',
      is_taxable:              0,   // Conveyance/Medical are tax-exempt up to limits
      group_for_payslip:       'Allowances',
      display_order:           3,
      disable_arrear:          0,
      display_total_on_process:1,
      tds_same_month:          0,
    },
    {
      name:                    'Special Allowance',
      category:                'Earning',
      round_format:            'Round',
      group_function:          'Sum',
      configure_on_profile:    0,   // Auto-calculated as residual (CTC - all others)
      display_on_profile:      1,
      is_editable:             0,
      contributed_by:          'Employee',
      is_taxable:              1,   // Special Allowance is fully taxable
      group_for_payslip:       'Allowances',
      display_order:           4,
      disable_arrear:          0,
      display_total_on_process:1,
      tds_same_month:          0,
    },
    {
      name:                    'Variable Pay',
      category:                'Earning',
      round_format:            'Round',
      group_function:          'Sum',
      configure_on_profile:    1,   // HR sets per employee based on performance
      display_on_profile:      1,
      is_editable:             1,
      contributed_by:          'Employee',
      is_taxable:              1,   // Bonus and OT are fully taxable
      group_for_payslip:       'Variable Pay',
      display_order:           5,
      disable_arrear:          1,   // No arrear on variable pay
      display_total_on_process:1,
      tds_same_month:          1,   // TDS in same month for bonus
    },
    {
      name:                    'Employer Contributions',
      category:                'Earning',
      round_format:            'Round',
      group_function:          'Sum',
      configure_on_profile:    0,   // Auto-computed — not editable per employee
      display_on_profile:      0,   // Shows in CTC breakdown only, not salary slip
      is_editable:             0,
      contributed_by:          'Employer',  // ← EMPLOYER pays, NOT employee
      is_taxable:              0,
      group_for_payslip:       "Employer's Contribution",
      display_order:           6,
      disable_arrear:          1,
      display_total_on_process:0,
      tds_same_month:          0,
    },
    // ── DEDUCTION GROUPS ──────────────────────────────────────
    {
      name:                    'Provident Fund',
      category:                'Deduction',
      round_format:            'Round',
      group_function:          'Sum',
      configure_on_profile:    0,
      display_on_profile:      1,
      is_editable:             0,   // Statutory — cannot change rate
      contributed_by:          'Employee',
      is_taxable:              0,
      group_for_payslip:       'Statutory Deductions',
      display_order:           7,
      disable_arrear:          1,
      display_total_on_process:1,
      tds_same_month:          0,
    },
    {
      name:                    'ESI',
      category:                'Deduction',
      round_format:            'Round',
      group_function:          'Sum',
      configure_on_profile:    0,
      display_on_profile:      1,
      is_editable:             0,   // Statutory — applies only if gross ≤ ₹21,000
      contributed_by:          'Employee',
      is_taxable:              0,
      group_for_payslip:       'Statutory Deductions',
      display_order:           8,
      disable_arrear:          1,
      display_total_on_process:1,
      tds_same_month:          0,
    },
    {
      name:                    'Tax Deductions',
      category:                'Deduction',
      round_format:            'Round',
      group_function:          'Sum',
      configure_on_profile:    0,
      display_on_profile:      1,
      is_editable:             0,
      contributed_by:          'Employee',
      is_taxable:              0,
      group_for_payslip:       'Tax Deductions',
      display_order:           9,
      disable_arrear:          1,
      display_total_on_process:1,
      tds_same_month:          1,   // TDS applied in same month
    },
    {
      name:                    'Other Deductions',
      category:                'Deduction',
      round_format:            'Round',
      group_function:          'Sum',
      configure_on_profile:    1,   // Loan EMI is per-employee
      display_on_profile:      1,
      is_editable:             1,
      contributed_by:          'Employee',
      is_taxable:              0,
      group_for_payslip:       'Other Deductions',
      display_order:           10,
      disable_arrear:          1,
      display_total_on_process:1,
      tds_same_month:          0,
    },
  ];

  // ── Step 3: Insert Groups ──────────────────────────────────
  console.log(bold('─── Inserting Groups ─────────────────────────────────\n'));
  const groupIds = {};

  for (const g of groups) {
    await conn.execute(`
      INSERT INTO \`payroll_component_groups\`
        (\`uuid\`, \`organization_id\`, \`company_id\`, \`name\`, \`category\`,
         \`round_format\`, \`group_function\`, \`configure_on_profile\`,
         \`display_on_profile\`, \`is_editable\`, \`contributed_by\`,
         \`is_active\`, \`recalculate_on_change\`, \`group_for_payslip\`,
         \`display_order\`, \`disable_arrear\`, \`display_total_on_process\`,
         \`tds_same_month\`, \`is_taxable\`, \`created_at\`, \`updated_at\`)
      VALUES (UUID(), 8, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      g.name, g.category, g.round_format, g.group_function,
      g.configure_on_profile, g.display_on_profile, g.is_editable,
      g.contributed_by, g.group_for_payslip, g.display_order,
      g.disable_arrear, g.display_total_on_process, g.tds_same_month, g.is_taxable
    ]);

    const [[row]] = await conn.execute(
      "SELECT id FROM `payroll_component_groups` WHERE name = ? AND organization_id = 8 ORDER BY id DESC LIMIT 1",
      [g.name]
    );
    groupIds[g.name] = row.id;
    console.log(green(`  ✅ [${String(row.id).padStart(2)}] ${g.name}`) + cyan(`  (${g.category}, order=${g.display_order}, contributed_by=${g.contributed_by})`));
  }

  // ── Step 4: Define Components ──────────────────────────────
  // Fields: group_name, name, based_on_attendance, non_cashable,
  //         component_type, module_source (for Module type)
  // Formulas/amounts are LEFT EMPTY — user sets them via UI
  // Type:
  //   Value  = fixed amount set by HR
  //   Derived = formula-based (e.g. 50% of Basic)
  //   Module = system-computed (Loan EMI, LOP, OT from attendance)

  const components = [
    // ── Group 1: Basic Pay ─────────────────────────────────
    {
      group:              'Basic Pay',
      name:               'Basic Salary',
      based_on_att:       1,   // Prorated by attendance
      non_cashable:       0,
      type:               'Derived',  // Formula: 40-50% of CTC
      module_source:      null,
      note:               '40-50% of CTC — formula: "40% of CTC"'
    },

    // ── Group 2: House Rent Allowance ──────────────────────
    {
      group:              'House Rent Allowance',
      name:               'House Rent Allowance (HRA)',
      based_on_att:       1,   // Prorated by attendance
      non_cashable:       0,
      type:               'Derived',  // Formula: 40% of Basic
      module_source:      null,
      note:               'Metro: 50% of Basic | Non-Metro: 40% of Basic'
    },

    // ── Group 3: Statutory Allowances ─────────────────────
    {
      group:              'Statutory Allowances',
      name:               'Conveyance Allowance',
      based_on_att:       0,   // Fixed monthly — not attendance-linked
      non_cashable:       0,
      type:               'Value',   // Fixed ₹1,600/month
      module_source:      null,
      note:               'Fixed ₹1,600/month — tax-exempt under Sec 10(14)'
    },
    {
      group:              'Statutory Allowances',
      name:               'Medical Allowance',
      based_on_att:       0,
      non_cashable:       0,
      type:               'Value',   // Fixed ₹1,250/month
      module_source:      null,
      note:               'Fixed ₹1,250/month — tax-exempt under Sec 10(14)'
    },
    {
      group:              'Statutory Allowances',
      name:               'Leave Travel Allowance (LTA)',
      based_on_att:       0,
      non_cashable:       0,
      type:               'Value',   // Set per employee
      module_source:      null,
      note:               'Annual — tax-exempt once in 2 years under Sec 10(5)'
    },

    // ── Group 4: Special Allowance ─────────────────────────
    {
      group:              'Special Allowance',
      name:               'Special Allowance',
      based_on_att:       1,   // Prorated by attendance
      non_cashable:       0,
      type:               'Derived',  // Residual = CTC - all other components
      module_source:      null,
      note:               'Residual allowance — formula: "CTC - (Basic + HRA + Others)"'
    },

    // ── Group 5: Variable Pay ──────────────────────────────
    {
      group:              'Variable Pay',
      name:               'Performance Bonus',
      based_on_att:       0,   // Not linked to attendance — HR decides
      non_cashable:       0,
      type:               'Value',
      module_source:      null,
      note:               'Paid monthly or quarterly based on KRA/KPI'
    },
    {
      group:              'Variable Pay',
      name:               'Overtime Pay',
      based_on_att:       1,
      non_cashable:       0,
      type:               'Module',   // Auto-computed from OT hours in attendance
      module_source:      'overtime',
      note:               'OT Hours × Hourly Rate × 2 — pulled from attendance_records'
    },

    // ── Group 6: Employer Contributions ───────────────────
    // non_cashable = 1 → part of CTC, NOT deducted from take-home
    {
      group:              'Employer Contributions',
      name:               'Employer PF Contribution',
      based_on_att:       0,
      non_cashable:       1,   // ← NOT deducted from salary
      type:               'Derived',
      module_source:      null,
      note:               '12% of Basic — EPF (3.67%) + EPS (8.33%). Employer pays, shows in CTC'
    },
    {
      group:              'Employer Contributions',
      name:               'Employer ESIC Contribution',
      based_on_att:       0,
      non_cashable:       1,
      type:               'Derived',
      module_source:      null,
      note:               '3.25% of Gross — only if Gross ≤ ₹21,000. Employer pays, shows in CTC'
    },
    {
      group:              'Employer Contributions',
      name:               'Gratuity',
      based_on_att:       0,
      non_cashable:       1,
      type:               'Derived',
      module_source:      null,
      note:               '4.81% of Basic — payable after 5 years of service'
    },
    {
      group:              'Employer Contributions',
      name:               'EDLI (Employer Insurance)',
      based_on_att:       0,
      non_cashable:       1,
      type:               'Derived',
      module_source:      null,
      note:               '0.5% of Basic — max ₹75/month. Employee life insurance funded by employer'
    },

    // ── Group 7: Provident Fund ────────────────────────────
    {
      group:              'Provident Fund',
      name:               'Employee PF (EPF)',
      based_on_att:       1,
      non_cashable:       0,
      type:               'Derived',  // 12% of Basic, capped ₹1,800
      module_source:      null,
      note:               '12% of Basic — max ₹1,800/month. Deducted from employee salary'
    },

    // ── Group 8: ESI ───────────────────────────────────────
    {
      group:              'ESI',
      name:               'Employee ESIC',
      based_on_att:       1,
      non_cashable:       0,
      type:               'Derived',  // 0.75% of Gross if Gross ≤ 21000
      module_source:      null,
      note:               '0.75% of Gross — only if Gross ≤ ₹21,000. Conditional formula needed'
    },

    // ── Group 9: Tax Deductions ────────────────────────────
    {
      group:              'Tax Deductions',
      name:               'Professional Tax (PT)',
      based_on_att:       0,   // Fixed slab — not attendance-linked
      non_cashable:       0,
      type:               'Value',   // Maharashtra: ₹200/month if salary > ₹15,000
      module_source:      null,
      note:               'State-specific slab. Maharashtra: ₹200/month if Gross > ₹15,000'
    },
    {
      group:              'Tax Deductions',
      name:               'Tax Deducted at Source (TDS)',
      based_on_att:       0,
      non_cashable:       0,
      type:               'Module',   // Auto-computed from income tax slab
      module_source:      'tds',
      note:               'Income tax projected annually, divided by 12. Uses new vs old regime'
    },

    // ── Group 10: Other Deductions ─────────────────────────
    {
      group:              'Other Deductions',
      name:               'Loan EMI Recovery',
      based_on_att:       0,
      non_cashable:       0,
      type:               'Module',   // Auto-computed from employee_loans table
      module_source:      'loan_emi',
      note:               'Monthly EMI recovered from salary. Pulled from employee loan records'
    },
    {
      group:              'Other Deductions',
      name:               'Late Coming Deduction',
      based_on_att:       0,
      non_cashable:       0,
      type:               'Module',   // Auto-computed from attendance late records
      module_source:      'late_deduction',
      note:               'Deduction for late arrivals beyond grace period. Based on attendance_records'
    },
    {
      group:              'Other Deductions',
      name:               'Salary Advance Recovery',
      based_on_att:       0,
      non_cashable:       0,
      type:               'Module',   // Auto-computed from salary_advances table
      module_source:      'salary_advance',
      note:               'Recovery of advance salary. Pulled from salary_advances table'
    },
  ];

  // ── Step 5: Insert Components ──────────────────────────────
  console.log(bold('\n─── Inserting Components ─────────────────────────────\n'));

  for (const c of components) {
    const gId = groupIds[c.group];
    if (!gId) {
      console.log(red(`  ❌ No group found for: ${c.group}`));
      continue;
    }

    await conn.execute(`
      INSERT INTO \`payroll_components\`
        (\`uuid\`, \`organization_id\`, \`company_id\`, \`group_id\`, \`name\`,
         \`non_cashable\`, \`based_on_attendance\`, \`is_active\`,
         \`component_type\`, \`amount\`, \`formula\`, \`module_source\`,
         \`boundary_type\`, \`min_amount\`, \`max_amount\`,
         \`gender_filter\`, \`created_at\`, \`updated_at\`)
      VALUES (UUID(), 8, NULL, ?, ?, ?, ?, 1, ?, 0, NULL, ?, 'Choose', 0, 0, 'All', NOW(), NOW())
    `, [gId, c.name, c.non_cashable, c.based_on_att, c.type, c.module_source]);

    const tag = c.non_cashable ? yellow(' [Non-Cashable/Employer]') : '';
    const typeTag = c.type === 'Module' ? cyan(` [Module:${c.module_source}]`) : c.type === 'Derived' ? cyan(' [Formula]') : '';
    console.log(green(`  ✅ ${c.group.padEnd(26)} → ${c.name}`) + tag + typeTag);
    console.log(`       ${yellow('ℹ')}  ${c.note}`);
  }

  // ── Step 6: Update all slabs ───────────────────────────────
  console.log(bold('\n─── Updating Slabs ───────────────────────────────────\n'));

  const [allComps] = await conn.execute(
    "SELECT id FROM `payroll_components` WHERE organization_id = 8 ORDER BY id ASC"
  );
  const allIds = JSON.stringify(allComps.map(c => String(c.id)));

  await conn.execute(
    "UPDATE `payroll_slabs` SET `selected_component_ids` = ?, `updated_at` = NOW() WHERE `organization_id` = 8",
    [allIds]
  );

  const [slabs] = await conn.execute(
    "SELECT id, name FROM `payroll_slabs` WHERE organization_id = 8"
  );
  for (const s of slabs) {
    console.log(green(`  ✅ Slab [${s.id}] "${s.name}" — updated with all ${allComps.length} component IDs`));
  }

  // ── Final Summary ──────────────────────────────────────────
  console.log(bold('\n─── FINAL STRUCTURE ──────────────────────────────────\n'));

  const [finalGroups] = await conn.execute(`
    SELECT pcg.id, pcg.name, pcg.category, pcg.contributed_by, pcg.display_order,
           COUNT(pc.id) as comp_count
    FROM payroll_component_groups pcg
    LEFT JOIN payroll_components pc ON pc.group_id = pcg.id
    WHERE pcg.organization_id = 8
    GROUP BY pcg.id
    ORDER BY pcg.display_order
  `);

  for (const g of finalGroups) {
    const cat = g.category === 'Earning' ? green('Earning') : red('Deduction');
    const emp = g.contributed_by === 'Employer' ? yellow(' [EMPLOYER]') : '';
    console.log(`  [${String(g.id).padStart(2)}] ${g.name.padEnd(30)} ${cat}${emp}  — ${g.comp_count} component(s)`);
  }

  const [compCount] = await conn.execute(
    "SELECT COUNT(*) as total FROM `payroll_components` WHERE organization_id = 8"
  );
  console.log(bold(`\n  Total: ${finalGroups.length} groups, ${compCount[0].total} components\n`));

  await conn.end();

  console.log(bold(green('══════════════════════════════════════════════════════════')));
  console.log(bold(green(' ✅ PAYROLL STRUCTURE SEEDED SUCCESSFULLY!')));
  console.log(bold(green('══════════════════════════════════════════════════════════\n')));

  console.log('  Next steps:');
  console.log('  1. Restart server        →  npm run dev (in /server)');
  console.log('  2. Payroll → Components  →  Open each component, set formulas:');
  console.log('     • Basic Salary        →  "40% of CTC" or "50% of CTC"');
  console.log('     • HRA                 →  "40% of Basic Salary"');
  console.log('     • Special Allowance   →  "CTC - (Basic + HRA + Others)"');
  console.log('     • Employee PF (EPF)   →  "12% of Basic Salary" with max ₹1800');
  console.log('     • Employee ESIC       →  "0.75% of Gross" with condition Gross ≤ 21000');
  console.log('     • Employer PF         →  "12% of Basic Salary" (non-cashable)');
  console.log('     • Employer ESIC       →  "3.25% of Gross" (non-cashable, condition ≤21000)');
  console.log('     • Gratuity            →  "4.81% of Basic Salary" (non-cashable)');
  console.log('     • PT                  →  Set fixed ₹200');
  console.log('     • TDS, Loan, Late     →  Already set as Module type — auto-computed\n');
}

main().catch((err) => {
  console.error(red(`\n❌ Fatal error: ${err.message}`));
  process.exit(1);
});
