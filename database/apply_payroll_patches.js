/**
 * apply_payroll_patches.js
 * ─────────────────────────────────────────────────────────────
 * Applies ALL payroll DB patches to the 'health' database.
 * Combines: patch_payroll_columns + patch_payroll_v2 + fresh component seed
 *
 * Run:  node database/apply_payroll_patches.js
 * ─────────────────────────────────────────────────────────────
 */

const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host:               'localhost',
  port:               3306,
  user:               'root',
  password:           'root123',
  database:           'health',
  multipleStatements: true,
};

// ── Colour helpers ────────────────────────────────────────────
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;

async function run(conn, label, sql) {
  try {
    await conn.query(sql);
    console.log(green('  ✅') + ' ' + label);
  } catch (err) {
    // "Duplicate column" and "index already exists" are safe to ignore
    if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME') {
      console.log(yellow('  ⚡') + ' ' + label + yellow(' (already exists — skipped)'));
    } else {
      console.log(red('  ❌') + ' ' + label + red(` → ${err.message}`));
    }
  }
}

async function main() {
  console.log(bold('\n══════════════════════════════════════════════════'));
  console.log(bold(' Payroll DB Patch Runner — health database'));
  console.log(bold('══════════════════════════════════════════════════\n'));

  let conn;
  try {
    conn = await mysql.createConnection(DB_CONFIG);
    console.log(green('✅ Connected to MySQL → health\n'));
  } catch (err) {
    console.error(red(`❌ Cannot connect: ${err.message}`));
    process.exit(1);
  }

  // ──────────────────────────────────────────────────────────────
  // PHASE 1 — payroll_earnings: add missing columns
  // ──────────────────────────────────────────────────────────────
  console.log(bold('─── PHASE 1: payroll_earnings ───────────────────\n'));

  await run(conn,
    'payroll_earnings: allow NULL on component_id',
    'ALTER TABLE `payroll_earnings` MODIFY COLUMN `component_id` BIGINT UNSIGNED NULL'
  );
  await run(conn,
    'payroll_earnings: ADD component_name',
    "ALTER TABLE `payroll_earnings` ADD COLUMN `component_name` VARCHAR(255) NULL COMMENT 'Human-readable earning name'"
  );
  await run(conn,
    'payroll_earnings: ADD group_name',
    "ALTER TABLE `payroll_earnings` ADD COLUMN `group_name` VARCHAR(255) NULL COMMENT 'Parent group name'"
  );
  await run(conn,
    'payroll_earnings: ADD formula_used',
    "ALTER TABLE `payroll_earnings` ADD COLUMN `formula_used` TEXT NULL COMMENT 'Formula string used to compute this row'"
  );
  await run(conn,
    'payroll_earnings: ADD is_non_cashable',
    "ALTER TABLE `payroll_earnings` ADD COLUMN `is_non_cashable` TINYINT(1) DEFAULT 0 COMMENT '1 = in CTC but not paid in cash'"
  );
  await run(conn,
    'payroll_earnings: ADD deleted_at',
    'ALTER TABLE `payroll_earnings` ADD COLUMN `deleted_at` TIMESTAMP NULL'
  );

  // ──────────────────────────────────────────────────────────────
  // PHASE 2 — payroll_deductions
  // ──────────────────────────────────────────────────────────────
  console.log(bold('\n─── PHASE 2: payroll_deductions ─────────────────\n'));

  await run(conn,
    'payroll_deductions: allow NULL on component_id',
    'ALTER TABLE `payroll_deductions` MODIFY COLUMN `component_id` BIGINT UNSIGNED NULL'
  );
  await run(conn,
    'payroll_deductions: ADD component_name',
    "ALTER TABLE `payroll_deductions` ADD COLUMN `component_name` VARCHAR(255) NULL COMMENT 'Human-readable deduction label'"
  );
  await run(conn,
    'payroll_deductions: ADD deleted_at',
    'ALTER TABLE `payroll_deductions` ADD COLUMN `deleted_at` TIMESTAMP NULL'
  );

  // ──────────────────────────────────────────────────────────────
  // PHASE 3 — payroll_components
  // ──────────────────────────────────────────────────────────────
  console.log(bold('\n─── PHASE 3: payroll_components ─────────────────\n'));

  await run(conn,
    'payroll_components: ADD module_source',
    "ALTER TABLE `payroll_components` ADD COLUMN `module_source` VARCHAR(100) NULL COMMENT 'loan_emi | lop | tds | overtime | late_deduction | salary_advance'"
  );

  // ──────────────────────────────────────────────────────────────
  // PHASE 4 — payroll_runs
  // ──────────────────────────────────────────────────────────────
  console.log(bold('\n─── PHASE 4: payroll_runs ───────────────────────\n'));

  await run(conn, 'payroll_runs: ADD company_id',    "ALTER TABLE `payroll_runs` ADD COLUMN `company_id`   BIGINT UNSIGNED NULL COMMENT 'Multi-company isolation'");
  await run(conn, 'payroll_runs: ADD locked_by',     "ALTER TABLE `payroll_runs` ADD COLUMN `locked_by`    BIGINT UNSIGNED NULL COMMENT 'FK users.id — HR who locked the run'");
  await run(conn, 'payroll_runs: ADD locked_at',     "ALTER TABLE `payroll_runs` ADD COLUMN `locked_at`    DATETIME NULL COMMENT 'Timestamp when run was locked'");
  await run(conn, 'payroll_runs: ADD approved_by',   "ALTER TABLE `payroll_runs` ADD COLUMN `approved_by`  BIGINT UNSIGNED NULL COMMENT 'FK users.id — CEO who approved'");
  await run(conn, 'payroll_runs: ADD approved_at',   "ALTER TABLE `payroll_runs` ADD COLUMN `approved_at`  DATETIME NULL COMMENT 'Timestamp of approval'");
  await run(conn, 'payroll_runs: ADD published_at',  "ALTER TABLE `payroll_runs` ADD COLUMN `published_at` DATETIME NULL COMMENT 'Timestamp of payslip publish'");
  await run(conn, 'payroll_runs: ADD deleted_at',    "ALTER TABLE `payroll_runs` ADD COLUMN `deleted_at`   TIMESTAMP NULL");

  // ──────────────────────────────────────────────────────────────
  // PHASE 5 — payroll_run_employees
  // ──────────────────────────────────────────────────────────────
  console.log(bold('\n─── PHASE 5: payroll_run_employees ──────────────\n'));

  await run(conn, 'payroll_run_employees: ADD leave_days',       "ALTER TABLE `payroll_run_employees` ADD COLUMN `leave_days`         DECIMAL(6,2) DEFAULT 0.00 COMMENT 'Total leave days'");
  await run(conn, 'payroll_run_employees: ADD paid_leave_days',  "ALTER TABLE `payroll_run_employees` ADD COLUMN `paid_leave_days`    DECIMAL(6,2) DEFAULT 0.00 COMMENT 'Paid leave days'");
  await run(conn, 'payroll_run_employees: ADD unpaid_leave_days',"ALTER TABLE `payroll_run_employees` ADD COLUMN `unpaid_leave_days`  INT DEFAULT 0 COMMENT 'LOP days'");
  await run(conn, 'payroll_run_employees: ADD overtime_hours',   "ALTER TABLE `payroll_run_employees` ADD COLUMN `overtime_hours`     DECIMAL(6,2) DEFAULT 0.00 COMMENT 'OT hours worked'");
  await run(conn, 'payroll_run_employees: ADD tax_deducted',     "ALTER TABLE `payroll_run_employees` ADD COLUMN `tax_deducted`       DECIMAL(15,2) DEFAULT 0.00 COMMENT 'TDS deducted'");
  await run(conn, 'payroll_run_employees: ADD processed_at',     "ALTER TABLE `payroll_run_employees` ADD COLUMN `processed_at`       DATETIME NULL COMMENT 'Processing timestamp'");
  await run(conn, 'payroll_run_employees: ADD processing_notes', "ALTER TABLE `payroll_run_employees` ADD COLUMN `processing_notes`   TEXT NULL COMMENT 'Engine debug notes'");
  await run(conn, 'payroll_run_employees: ADD deleted_at',       "ALTER TABLE `payroll_run_employees` ADD COLUMN `deleted_at`         TIMESTAMP NULL");
  await run(conn, 'payroll_run_employees: fix status default',   "ALTER TABLE `payroll_run_employees` MODIFY COLUMN `status` VARCHAR(50) DEFAULT 'pending'");

  // ──────────────────────────────────────────────────────────────
  // PHASE 6 — payslips
  // ──────────────────────────────────────────────────────────────
  console.log(bold('\n─── PHASE 6: payslips ───────────────────────────\n'));

  await run(conn, 'payslips: is_locked default 0',   "ALTER TABLE `payslips` MODIFY COLUMN `is_locked` TINYINT(1) DEFAULT 0");
  await run(conn, 'payslips: ADD company_id',         "ALTER TABLE `payslips` ADD COLUMN `company_id`  BIGINT UNSIGNED NULL COMMENT 'Multi-company isolation'");
  await run(conn, 'payslips: ADD locked_at',          "ALTER TABLE `payslips` ADD COLUMN `locked_at`   DATETIME NULL COMMENT 'Timestamp payslip was locked'");
  await run(conn, 'payslips: ADD deleted_at',         "ALTER TABLE `payslips` ADD COLUMN `deleted_at`  TIMESTAMP NULL");
  await run(conn, 'payslips: ytd_gross default 0',    "ALTER TABLE `payslips` MODIFY COLUMN `ytd_gross` DECIMAL(15,2) NOT NULL DEFAULT 0.00");
  await run(conn, 'payslips: ytd_tax default 0',      "ALTER TABLE `payslips` MODIFY COLUMN `ytd_tax`   DECIMAL(15,2) NOT NULL DEFAULT 0.00");
  await run(conn, 'payslips: ytd_net default 0',      "ALTER TABLE `payslips` MODIFY COLUMN `ytd_net`   DECIMAL(15,2) NOT NULL DEFAULT 0.00");

  // ──────────────────────────────────────────────────────────────
  // PHASE 7 — salary_structures
  // ──────────────────────────────────────────────────────────────
  console.log(bold('\n─── PHASE 7: salary_structures ──────────────────\n'));

  await run(conn, 'salary_structures: ADD employee_id',      "ALTER TABLE `salary_structures` ADD COLUMN `employee_id`      BIGINT UNSIGNED NULL COMMENT 'Employee this structure belongs to'");
  await run(conn, 'salary_structures: ADD slab_id',          "ALTER TABLE `salary_structures` ADD COLUMN `slab_id`           BIGINT UNSIGNED NULL COMMENT 'Pay slab used'");
  await run(conn, 'salary_structures: ADD cycle_id',         "ALTER TABLE `salary_structures` ADD COLUMN `cycle_id`          BIGINT UNSIGNED NULL COMMENT 'Payroll cycle'");
  await run(conn, 'salary_structures: ADD annual_ctc',       "ALTER TABLE `salary_structures` ADD COLUMN `annual_ctc`        DECIMAL(15,2) NULL COMMENT 'Annual CTC'");
  await run(conn, 'salary_structures: ADD basic_monthly',    "ALTER TABLE `salary_structures` ADD COLUMN `basic_monthly`     DECIMAL(15,2) NULL COMMENT 'Monthly Basic'");
  await run(conn, 'salary_structures: ADD gross_monthly',    "ALTER TABLE `salary_structures` ADD COLUMN `gross_monthly`     DECIMAL(15,2) NULL COMMENT 'Monthly Gross'");
  await run(conn, 'salary_structures: ADD pf_employer',      "ALTER TABLE `salary_structures` ADD COLUMN `pf_employer`       DECIMAL(15,2) NULL COMMENT 'Employer PF'");
  await run(conn, 'salary_structures: ADD esic_employer',    "ALTER TABLE `salary_structures` ADD COLUMN `esic_employer`     DECIMAL(15,2) NULL COMMENT 'Employer ESIC'");
  await run(conn, 'salary_structures: ADD tds_deduction',    "ALTER TABLE `salary_structures` ADD COLUMN `tds_deduction`     DECIMAL(15,2) NULL COMMENT 'Monthly TDS override'");
  await run(conn, 'salary_structures: ADD arrear_pay_month', "ALTER TABLE `salary_structures` ADD COLUMN `arrear_pay_month`  VARCHAR(10) NULL COMMENT 'YYYY-MM for backdated arrears'");

  // ──────────────────────────────────────────────────────────────
  // PHASE 8 — Indexes
  // ──────────────────────────────────────────────────────────────
  console.log(bold('\n─── PHASE 8: Performance Indexes ────────────────\n'));

  await run(conn, 'INDEX: payroll_earnings → run_employee_id', "ALTER TABLE `payroll_earnings`     ADD INDEX `idx_pe_run_emp`       (`payroll_run_employee_id`)");
  await run(conn, 'INDEX: payroll_earnings → component_id',    "ALTER TABLE `payroll_earnings`     ADD INDEX `idx_pe_comp_id`       (`component_id`)");
  await run(conn, 'INDEX: payroll_deductions → run_employee',  "ALTER TABLE `payroll_deductions`   ADD INDEX `idx_pd_run_emp`       (`payroll_run_employee_id`)");
  await run(conn, 'INDEX: payroll_deductions → component_id',  "ALTER TABLE `payroll_deductions`   ADD INDEX `idx_pd_comp_id`       (`component_id`)");
  await run(conn, 'INDEX: payroll_components → org + active',  "ALTER TABLE `payroll_components`   ADD INDEX `idx_pc_org_active`    (`organization_id`, `is_active`)");
  await run(conn, 'INDEX: payroll_slabs → ctc range',          "ALTER TABLE `payroll_slabs`        ADD INDEX `idx_ps_ctc_range`     (`organization_id`, `min_ctc`, `max_ctc`)");
  await run(conn, 'INDEX: payroll_run_employees → run+status', "ALTER TABLE `payroll_run_employees` ADD INDEX `idx_pre_run_status`  (`payroll_run_id`, `status`)");
  await run(conn, 'INDEX: salary_structures → employee_id',    "ALTER TABLE `salary_structures`    ADD INDEX `idx_ss_employee`      (`employee_id`)");

  // ──────────────────────────────────────────────────────────────
  // PHASE 9 — Fresh Component Seed
  // ──────────────────────────────────────────────────────────────
  console.log(bold('\n─── PHASE 9: Fresh Component Groups + Components ─\n'));

  // Disable FK checks
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  console.log(yellow('  ⚡ FK checks disabled'));

  // Clear existing data
  await run(conn, 'CLEAR: payroll_slab_components',  'DELETE FROM `payroll_slab_components`');
  await run(conn, 'CLEAR: payroll_components',        'DELETE FROM `payroll_components`');
  await run(conn, 'CLEAR: payroll_component_groups',  'DELETE FROM `payroll_component_groups`');

  // Reset AUTO_INCREMENT
  await run(conn, 'RESET: component_groups AUTO_INCREMENT', 'ALTER TABLE `payroll_component_groups` AUTO_INCREMENT = 1');
  await run(conn, 'RESET: components AUTO_INCREMENT',       'ALTER TABLE `payroll_components`       AUTO_INCREMENT = 1');

  // Insert Group 1: Earnings
  await run(conn, 'INSERT Group: Standard Earnings', `
    INSERT INTO \`payroll_component_groups\`
      (\`uuid\`, \`organization_id\`, \`company_id\`, \`name\`, \`category\`,
       \`round_format\`, \`group_function\`, \`configure_on_profile\`,
       \`display_on_profile\`, \`is_editable\`, \`contributed_by\`,
       \`is_active\`, \`recalculate_on_change\`, \`group_for_payslip\`,
       \`display_order\`, \`disable_arrear\`, \`display_total_on_process\`,
       \`tds_same_month\`, \`is_taxable\`, \`created_at\`, \`updated_at\`)
    VALUES
      (UUID(), 8, NULL, 'Standard Earnings', 'Earning',
       'Round', 'Sum', 1, 1, 1, 'Employee',
       1, 0, 'Earnings', 1, 0, 1, 0, 1, NOW(), NOW())
  `);

  // Insert Group 2: Deductions
  await run(conn, 'INSERT Group: Statutory Deductions', `
    INSERT INTO \`payroll_component_groups\`
      (\`uuid\`, \`organization_id\`, \`company_id\`, \`name\`, \`category\`,
       \`round_format\`, \`group_function\`, \`configure_on_profile\`,
       \`display_on_profile\`, \`is_editable\`, \`contributed_by\`,
       \`is_active\`, \`recalculate_on_change\`, \`group_for_payslip\`,
       \`display_order\`, \`disable_arrear\`, \`display_total_on_process\`,
       \`tds_same_month\`, \`is_taxable\`, \`created_at\`, \`updated_at\`)
    VALUES
      (UUID(), 8, NULL, 'Statutory Deductions', 'Deduction',
       'Round', 'Sum', 1, 1, 0, 'Employee',
       1, 0, 'Deductions', 2, 0, 1, 0, 0, NOW(), NOW())
  `);

  // Get group IDs
  const [[earningsGroup]] = await conn.query(
    "SELECT id FROM `payroll_component_groups` WHERE name = 'Standard Earnings' AND organization_id = 8 LIMIT 1"
  );
  const [[deductionsGroup]] = await conn.query(
    "SELECT id FROM `payroll_component_groups` WHERE name = 'Statutory Deductions' AND organization_id = 8 LIMIT 1"
  );
  const egId = earningsGroup.id;
  const dgId = deductionsGroup.id;
  console.log(yellow(`  ℹ  Earnings group_id=${egId}, Deductions group_id=${dgId}`));

  // Insert 8 Earning components
  const earningComponents = [
    ['Basic Salary',                    1],
    ['House Rent Allowance (HRA)',       1],
    ['Special Allowance',               1],
    ['Conveyance Allowance',            0],
    ['Leave Travel Allowance (LTA)',    0],
    ['Medical Allowance',               0],
    ['Overtime Pay',                    1],
    ['Performance Bonus',               0],
  ];

  for (const [name, basedOnAtt] of earningComponents) {
    await run(conn, `INSERT Component: ${name}`, `
      INSERT INTO \`payroll_components\`
        (\`uuid\`, \`organization_id\`, \`company_id\`, \`group_id\`, \`name\`,
         \`non_cashable\`, \`based_on_attendance\`, \`is_active\`,
         \`component_type\`, \`amount\`, \`formula\`,
         \`boundary_type\`, \`min_amount\`, \`max_amount\`,
         \`gender_filter\`, \`created_at\`, \`updated_at\`)
      VALUES
        (UUID(), 8, NULL, ${egId}, '${name}',
         0, ${basedOnAtt}, 1, 'Value', 0, NULL,
         'Choose', 0, 0, 'All', NOW(), NOW())
    `);
  }

  // Insert 4 Deduction components
  const deductionComponents = [
    ['Employee Provident Fund (EPF)',      1],
    ['Employee State Insurance (ESIC)',   1],
    ['Professional Tax (PT)',             0],
    ['Tax Deducted at Source (TDS)',      0],
  ];

  for (const [name, basedOnAtt] of deductionComponents) {
    await run(conn, `INSERT Component: ${name}`, `
      INSERT INTO \`payroll_components\`
        (\`uuid\`, \`organization_id\`, \`company_id\`, \`group_id\`, \`name\`,
         \`non_cashable\`, \`based_on_attendance\`, \`is_active\`,
         \`component_type\`, \`amount\`, \`formula\`,
         \`boundary_type\`, \`min_amount\`, \`max_amount\`,
         \`gender_filter\`, \`created_at\`, \`updated_at\`)
      VALUES
        (UUID(), 8, NULL, ${dgId}, '${name}',
         0, ${basedOnAtt}, 1, 'Value', 0, NULL,
         'Choose', 0, 0, 'All', NOW(), NOW())
    `);
  }

  // Update slabs to include all new component IDs
  const [allComps] = await conn.query(
    "SELECT id FROM `payroll_components` WHERE organization_id = 8 ORDER BY id ASC"
  );
  const allIds = JSON.stringify(allComps.map(c => String(c.id)));

  await run(conn, 'UPDATE slabs: set selected_component_ids', `
    UPDATE \`payroll_slabs\`
    SET \`selected_component_ids\` = '${allIds}', \`updated_at\` = NOW()
    WHERE \`organization_id\` = 8
  `);

  // Re-enable FK checks
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log(green('  ✅ FK checks re-enabled'));

  // ── Final Verification ────────────────────────────────────────
  console.log(bold('\n─── VERIFICATION ────────────────────────────────\n'));

  const [groups] = await conn.query(
    "SELECT id, name, category, display_order FROM `payroll_component_groups` WHERE organization_id = 8 ORDER BY display_order"
  );
  console.log('  Component Groups:');
  for (const g of groups) {
    console.log(`    [${g.id}] ${g.name} (${g.category})`);
  }

  const [comps] = await conn.query(
    `SELECT pc.id, pc.name, pcg.name AS group_name
     FROM \`payroll_components\` pc
     JOIN \`payroll_component_groups\` pcg ON pc.group_id = pcg.id
     WHERE pc.organization_id = 8
     ORDER BY pcg.display_order, pc.id`
  );
  console.log('\n  Components:');
  for (const c of comps) {
    console.log(`    [${c.id}] ${c.name}  →  ${c.group_name}`);
  }

  const [slabs] = await conn.query(
    "SELECT id, name, selected_component_ids FROM `payroll_slabs` WHERE organization_id = 8"
  );
  console.log('\n  Slabs updated:');
  for (const s of slabs) {
    console.log(`    [${s.id}] ${s.name} → component_ids: ${s.selected_component_ids}`);
  }

  await conn.end();

  console.log(bold(green('\n══════════════════════════════════════════════════')));
  console.log(bold(green(' ✅ ALL PATCHES APPLIED SUCCESSFULLY!')));
  console.log(bold(green('══════════════════════════════════════════════════\n')));
  console.log('  Next steps:');
  console.log('  1. Restart the backend server  →  npm run dev (in /server)');
  console.log('  2. Open the app → Payroll → Components → set formulas/values');
  console.log('  3. Run a payroll → Generate → Process → Publish\n');
}

main().catch((err) => {
  console.error(red(`\n❌ Fatal error: ${err.message}`));
  process.exit(1);
});
