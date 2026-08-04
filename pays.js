/**
 * pays.js — Enterprise Payroll DB Patch Script
 * ─────────────────────────────────────────────
 * Run: node pays.js
 *
 * This script is IDEMPOTENT — safe to run multiple times.
 * It patches the payroll tables with branch support, upload log tracking,
 * and display-payslip toggle required by the Enterprise Payroll Console.
 */

const mysql = require('mysql2/promise');
const path  = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, 'server', '.env') });

const dbConfig = {
  host:               process.env.DB_HOST     || 'localhost',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || 'root123',
  database:           process.env.DB_NAME     || 'apponexthrms',
  port:               parseInt(process.env.DB_PORT || '3306', 10),
  multipleStatements: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function columnExists(conn, table, column) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [dbConfig.database, table, column]
  );
  return rows[0].cnt > 0;
}

async function tableExists(conn, table) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [dbConfig.database, table]
  );
  return rows[0].cnt > 0;
}

async function addColumnSafe(conn, table, column, definition) {
  if (await columnExists(conn, table, column)) {
    console.log(`  ⏭  Column already exists: ${table}.${column}`);
    return;
  }
  await conn.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  console.log(`  ✅ Added: ${table}.${column}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   ApponextHRMS — Enterprise Payroll DB Patch (pays.js)      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const conn = await mysql.createConnection(dbConfig);
  console.log(`🔌 Connected to MySQL: ${dbConfig.database} @ ${dbConfig.host}:${dbConfig.port}`);
  console.log('');

  try {

    // ──────────────────────────────────────────────────────────────────────────
    // 1. PATCH: payroll_runs
    // ──────────────────────────────────────────────────────────────────────────
    console.log('📦 Patching: payroll_runs');

    // branch_id — allows running payroll for a specific branch or all branches
    await addColumnSafe(
      conn, 'payroll_runs', 'branch_id',
      'BIGINT UNSIGNED NULL DEFAULT NULL COMMENT "NULL = All Branches; Set to branches.id for branch-specific runs"'
    );

    // display_payslip — controls whether employees can see their payslip immediately
    await addColumnSafe(
      conn, 'payroll_runs', 'display_payslip',
      'TINYINT(1) NOT NULL DEFAULT 0 COMMENT "0 = Hidden; 1 = Visible to employees after publish"'
    );

    // payment_status — track the overall payment disbursement state of the run
    await addColumnSafe(
      conn, 'payroll_runs', 'payment_status',
      `ENUM('draft','processing','paid','failed','cancelled') NOT NULL DEFAULT 'draft'
       COMMENT "Bank disbursement status for this payroll run"`
    );

    // generated_by_name — free-text display name of who initiated the run (HR/Admin name)
    await addColumnSafe(
      conn, 'payroll_runs', 'generated_by_name',
      'VARCHAR(150) NULL DEFAULT NULL COMMENT "Display name of HR/Admin who generated this run"'
    );

    // total_gross — cached total gross payout amount for quick dashboard display
    await addColumnSafe(
      conn, 'payroll_runs', 'total_gross_amount',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Cached: sum of all employee gross salaries in this run"'
    );

    // total_deductions — cached sum of all statutory deductions
    await addColumnSafe(
      conn, 'payroll_runs', 'total_deductions_amount',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Cached: sum of PF+ESI+TDS+PT deductions"'
    );

    // total_net — cached total net payout after deductions
    await addColumnSafe(
      conn, 'payroll_runs', 'total_net_amount',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Cached: total net salary disbursed in this run"'
    );

    // bypass_cache — flag set when HR clicks Bypass Cache before recalculation
    await addColumnSafe(
      conn, 'payroll_runs', 'bypass_cache',
      'TINYINT(1) NOT NULL DEFAULT 0 COMMENT "1 = force-recalculate all salaries ignoring cache"'
    );

    console.log('');

    // ──────────────────────────────────────────────────────────────────────────
    // 2. PATCH: payroll_run_employees
    // ──────────────────────────────────────────────────────────────────────────
    console.log('📦 Patching: payroll_run_employees');

    // branch_id — denormalized for fast branch-wise queries on the processing grid
    await addColumnSafe(
      conn, 'payroll_run_employees', 'branch_id',
      'BIGINT UNSIGNED NULL DEFAULT NULL COMMENT "Denormalized branch_id from employee record"'
    );

    // salary_days — total calendar/working days in the pay month
    await addColumnSafe(
      conn, 'payroll_run_employees', 'salary_days',
      'INT NOT NULL DEFAULT 30 COMMENT "Total salary days in this pay month (28-31)"'
    );

    // paid_days — actual paid days after LOP deduction (editable in the grid)
    await addColumnSafe(
      conn, 'payroll_run_employees', 'paid_days',
      'DECIMAL(5,2) NOT NULL DEFAULT 30 COMMENT "Actual paid days after LOP/unpaid leaves"'
    );

    // unpaid_days — loss of pay days
    await addColumnSafe(
      conn, 'payroll_run_employees', 'unpaid_days',
      'DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT "LOP / unpaid days in this pay month"'
    );

    // basic — base basic salary from salary structure
    await addColumnSafe(
      conn, 'payroll_run_employees', 'basic',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Base monthly basic from salary structure"'
    );

    // hra — house rent allowance base
    await addColumnSafe(
      conn, 'payroll_run_employees', 'hra',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Base monthly HRA from salary structure"'
    );

    // standard_allowance
    await addColumnSafe(
      conn, 'payroll_run_employees', 'standard_allowance',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Standard allowance from salary structure"'
    );

    // meal_allowance
    await addColumnSafe(
      conn, 'payroll_run_employees', 'meal_allowance',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Meal allowance from salary structure"'
    );

    // communication_allowance
    await addColumnSafe(
      conn, 'payroll_run_employees', 'communication_allowance',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Communication allowance from salary structure"'
    );

    // child_education_allowance
    await addColumnSafe(
      conn, 'payroll_run_employees', 'child_education_allowance',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Child education allowance from salary structure"'
    );

    // lta — leave travel allowance
    await addColumnSafe(
      conn, 'payroll_run_employees', 'lta',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Leave Travel Allowance from salary structure"'
    );

    // gross_salary — sum of all allowances (base, not prorated)
    await addColumnSafe(
      conn, 'payroll_run_employees', 'gross_salary',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Total gross salary (all components pre-proration)"'
    );

    // gross_earned — prorated gross after paid_days adjustment
    await addColumnSafe(
      conn, 'payroll_run_employees', 'gross_earned',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Prorated gross: (gross_salary / salary_days) * paid_days"'
    );

    // overtime_hours
    await addColumnSafe(
      conn, 'payroll_run_employees', 'overtime_hours',
      'DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT "Overtime hours worked in this pay period"'
    );

    // overtime_amount
    await addColumnSafe(
      conn, 'payroll_run_employees', 'overtime_amount',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Calculated overtime pay"'
    );

    // adjustment — manual +/- adjustment by HR
    await addColumnSafe(
      conn, 'payroll_run_employees', 'adjustment',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "One-time manual adjustment (+/-) by HR"'
    );

    // pt — professional tax
    await addColumnSafe(
      conn, 'payroll_run_employees', 'professional_tax',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Professional Tax (PT) deduction"'
    );

    // pf_employee — employee PF contribution
    await addColumnSafe(
      conn, 'payroll_run_employees', 'pf_employee',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Employee PF contribution (12% of basic capped at ₹15000)"'
    );

    // pf_employer — employer PF contribution
    await addColumnSafe(
      conn, 'payroll_run_employees', 'pf_employer',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Employer PF contribution"'
    );

    // esi_employee — employee ESI contribution
    await addColumnSafe(
      conn, 'payroll_run_employees', 'esi_employee',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Employee ESI contribution (0.75% if gross ≤ ₹21000)"'
    );

    // esi_employer — employer ESI contribution
    await addColumnSafe(
      conn, 'payroll_run_employees', 'esi_employer',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Employer ESI contribution (3.25%)"'
    );

    // tds — TDS income tax deduction
    await addColumnSafe(
      conn, 'payroll_run_employees', 'tds',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Monthly TDS income tax deduction"'
    );

    // total_deduction — sum of PT + PF + ESI + TDS
    await addColumnSafe(
      conn, 'payroll_run_employees', 'total_deduction',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Total statutory deductions in this pay period"'
    );

    // net_salary — gross_earned + OT + adjustments - total_deduction
    await addColumnSafe(
      conn, 'payroll_run_employees', 'net_salary',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Final take-home net salary"'
    );

    // ctc — cost to company (gross + employer PF + employer ESI)
    await addColumnSafe(
      conn, 'payroll_run_employees', 'ctc',
      'DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT "Cost To Company = gross + employer PF + employer ESI"'
    );

    // bank_name — denormalized bank name for quick export
    await addColumnSafe(
      conn, 'payroll_run_employees', 'bank_name',
      'VARCHAR(150) NULL DEFAULT NULL COMMENT "Bank name from employee bank details"'
    );

    // payment_status per employee (individual status within the run)
    await addColumnSafe(
      conn, 'payroll_run_employees', 'payment_status',
      `ENUM('pending','paid','failed','on_hold') NOT NULL DEFAULT 'pending'
       COMMENT "Individual employee payment disbursement status"`
    );

    // notes — HR notes / remarks for this employee's pay in this cycle
    await addColumnSafe(
      conn, 'payroll_run_employees', 'notes',
      'TEXT NULL DEFAULT NULL COMMENT "HR notes for this employee payroll row"'
    );

    console.log('');

    // ──────────────────────────────────────────────────────────────────────────
    // 3. PATCH: payslips
    // ──────────────────────────────────────────────────────────────────────────
    console.log('📦 Patching: payslips');

    await addColumnSafe(
      conn, 'payslips', 'branch_id',
      'BIGINT UNSIGNED NULL DEFAULT NULL COMMENT "Branch this payslip belongs to"'
    );

    await addColumnSafe(
      conn, 'payslips', 'display_to_employee',
      'TINYINT(1) NOT NULL DEFAULT 0 COMMENT "1 = Employee can view payslip on their portal"'
    );

    await addColumnSafe(
      conn, 'payslips', 'payment_status',
      `ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending'
       COMMENT "Individual payslip payment status"`
    );

    console.log('');

    // ──────────────────────────────────────────────────────────────────────────
    // 4. CREATE TABLE: payroll_upload_logs
    // ──────────────────────────────────────────────────────────────────────────
    console.log('🏗  Checking: payroll_upload_logs');

    if (await tableExists(conn, 'payroll_upload_logs')) {
      console.log('  ⏭  Table already exists: payroll_upload_logs');
    } else {
      await conn.execute(`
        CREATE TABLE \`payroll_upload_logs\` (
          \`id\`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          \`uuid\`            CHAR(36) NOT NULL UNIQUE,
          \`organization_id\` BIGINT UNSIGNED NOT NULL,
          \`branch_id\`       BIGINT UNSIGNED NULL DEFAULT NULL,
          \`uploaded_by\`     BIGINT UNSIGNED NOT NULL,
          \`payroll_cycle\`   VARCHAR(50) NOT NULL COMMENT "e.g. Monthly, Bi-Weekly",
          \`upload_month\`    VARCHAR(10) NOT NULL COMMENT "YYYY-MM format",
          \`file_name\`       VARCHAR(255) NOT NULL,
          \`file_size\`       INT UNSIGNED NOT NULL DEFAULT 0,
          \`file_type\`       ENUM('csv','xlsx','xls') NOT NULL DEFAULT 'csv',
          \`total_rows\`      INT NOT NULL DEFAULT 0,
          \`success_rows\`    INT NOT NULL DEFAULT 0,
          \`error_rows\`      INT NOT NULL DEFAULT 0,
          \`display_payslip\` TINYINT(1) NOT NULL DEFAULT 0,
          \`status\`          ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
          \`error_details\`   JSON NULL COMMENT "Array of row-level validation errors",
          \`created_at\`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_pu_org\`     (\`organization_id\`),
          INDEX \`idx_pu_branch\`  (\`branch_id\`),
          INDEX \`idx_pu_month\`   (\`upload_month\`),
          INDEX \`idx_pu_status\`  (\`status\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
          COMMENT "Tracks all payroll CSV/Excel bulk upload operations";
      `);
      console.log('  ✅ Created: payroll_upload_logs');
    }

    console.log('');

    // ──────────────────────────────────────────────────────────────────────────
    // 5. Add indexes for branch-based payroll queries
    // ──────────────────────────────────────────────────────────────────────────
    console.log('📦 Adding branch-based indexes (if not present)');

    // Check and add index on payroll_runs.branch_id
    const [idxRunBranch] = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'payroll_runs' AND INDEX_NAME = 'idx_pr_branch_id'`,
      [dbConfig.database]
    );
    if (idxRunBranch[0].cnt === 0) {
      await conn.execute(`ALTER TABLE \`payroll_runs\` ADD INDEX \`idx_pr_branch_id\` (\`branch_id\`)`);
      console.log('  ✅ Index added: payroll_runs.branch_id');
    } else {
      console.log('  ⏭  Index already exists: payroll_runs.branch_id');
    }

    // Check and add index on payroll_run_employees.branch_id
    const [idxEmpBranch] = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'payroll_run_employees' AND INDEX_NAME = 'idx_pre_branch_id'`,
      [dbConfig.database]
    );
    if (idxEmpBranch[0].cnt === 0) {
      await conn.execute(`ALTER TABLE \`payroll_run_employees\` ADD INDEX \`idx_pre_branch_id\` (\`branch_id\`)`);
      console.log('  ✅ Index added: payroll_run_employees.branch_id');
    } else {
      console.log('  ⏭  Index already exists: payroll_run_employees.branch_id');
    }

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ pays.js Patch Completed Successfully!                    ║');
    console.log('║                                                              ║');
    console.log('║  Summary of Changes:                                         ║');
    console.log('║  • payroll_runs         — branch_id, display_payslip,        ║');
    console.log('║                           payment_status, total_gross/net,   ║');
    console.log('║                           bypass_cache, generated_by_name    ║');
    console.log('║  • payroll_run_employees — branch_id, paid_days, basic, hra, ║');
    console.log('║                           allowances, deductions, net_salary, ║');
    console.log('║                           ctc, bank_name, payment_status     ║');
    console.log('║  • payslips             — branch_id, display_to_employee,    ║');
    console.log('║                           payment_status                     ║');
    console.log('║  • payroll_upload_logs  — NEW table for CSV upload tracking  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (err) {
    console.error('❌ Error during pays.js patch:', err.message || err);
    process.exit(1);
  } finally {
    await conn.end();
    console.log('🔌 Database connection closed.');
  }
}

main();
