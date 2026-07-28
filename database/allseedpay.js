const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function createPayrollTables() {
  console.log('\n🚀 Starting Payroll Module DDL Table Creation Script (.js)...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'apponexthrms',
    port: parseInt(process.env.DB_PORT || '3306'),
    multipleStatements: true
  });

  try {
    console.log(`📦 Creating/Verifying all 16 Payroll Tables in DB "${process.env.DB_NAME || 'apponexthrms'}"...`);

    const sql = `
      -- 1. Payroll Policies Table
      CREATE TABLE IF NOT EXISTS \`payroll_policies\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`code\` VARCHAR(50) DEFAULT 'POL-01',
        \`name\` VARCHAR(255) DEFAULT 'Standard Payroll Policy',
        \`policy_name\` VARCHAR(255) DEFAULT 'Standard Payroll Policy',
        \`pay_cycle_type\` VARCHAR(50) DEFAULT 'monthly',
        \`pay_calculation_basis\` VARCHAR(50) DEFAULT 'calendar_days',
        \`fixed_working_days\` INT DEFAULT 26,
        \`cutoff_day\` INT DEFAULT 25,
        \`pay_day\` INT DEFAULT 1,
        \`lop_deduction_formula\` VARCHAR(50) DEFAULT 'gross_divided_by_days',
        \`overtime_rate_multiplier\` DECIMAL(5,2) DEFAULT 1.50,
        \`status\` VARCHAR(50) DEFAULT 'active',
        \`created_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`updated_by\` BIGINT UNSIGNED DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`unique_org_policy_code\` (\`organization_id\`, \`code\`),
        INDEX (\`organization_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 2. Payroll Cycles Table
      CREATE TABLE IF NOT EXISTS \`payroll_cycles\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`cycle_name\` VARCHAR(255) NOT NULL,
        \`cycle_code\` VARCHAR(100) NOT NULL,
        \`cycle_type\` VARCHAR(50) DEFAULT 'monthly',
        \`cycle_start_date\` DATE NOT NULL,
        \`cycle_end_date\` DATE NOT NULL,
        \`payroll_run_date\` DATE NOT NULL,
        \`salary_credit_date\` DATE NOT NULL,
        \`is_current_cycle\` TINYINT(1) DEFAULT 1,
        \`status\` VARCHAR(50) DEFAULT 'open',
        \`created_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`updated_by\` BIGINT UNSIGNED DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`unique_org_cycle_code\` (\`organization_id\`, \`cycle_code\`),
        INDEX (\`organization_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 3. Salary Components Table
      CREATE TABLE IF NOT EXISTS \`salary_components\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`component_code\` VARCHAR(50) NOT NULL,
        \`component_name\` VARCHAR(100) NOT NULL,
        \`component_type\` ENUM('earnings', 'deductions') NOT NULL,
        \`earnings_type\` ENUM('basic', 'hra', 'allowance', 'bonus', 'variable', 'overtime', 'lta') NULL,
        \`deduction_type\` ENUM('pf', 'esi', 'pt', 'tds', 'lwf', 'loan', 'advance', 'other') NULL,
        \`is_taxable\` TINYINT(1) DEFAULT 1,
        \`is_recurring\` TINYINT(1) DEFAULT 1,
        \`is_monthly\` TINYINT(1) DEFAULT 1,
        \`percentage_of_basic\` DECIMAL(5,2) NULL,
        \`calculation_method\` VARCHAR(50) NOT NULL DEFAULT 'percentage',
        \`calculation_formula\` TEXT NULL,
        \`min_limit\` DECIMAL(12,2) NULL,
        \`max_limit\` DECIMAL(12,2) NULL,
        \`sort_order\` INT DEFAULT 0,
        \`status\` VARCHAR(50) DEFAULT 'active',
        \`created_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`updated_by\` BIGINT UNSIGNED DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` TIMESTAMP NULL,
        UNIQUE KEY \`unique_org_comp_code\` (\`organization_id\`, \`component_code\`),
        INDEX (\`organization_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 4. Pay Component Definitions Table
      CREATE TABLE IF NOT EXISTS \`pay_component_definitions\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`code\` VARCHAR(50) NOT NULL,
        \`component_code\` VARCHAR(50) DEFAULT 'COMP',
        \`name\` VARCHAR(255) NOT NULL,
        \`component_name\` VARCHAR(255) DEFAULT 'Component',
        \`component_type\` VARCHAR(50) NOT NULL,
        \`calculation_type\` VARCHAR(50) NOT NULL DEFAULT 'fixed',
        \`formula_expression\` TEXT NULL,
        \`is_taxable\` TINYINT(1) DEFAULT 1,
        \`is_pf_applicable\` TINYINT(1) DEFAULT 1,
        \`is_esi_applicable\` TINYINT(1) DEFAULT 1,
        \`is_pt_applicable\` TINYINT(1) DEFAULT 1,
        \`is_statutory\` TINYINT(1) DEFAULT 0,
        \`status\` VARCHAR(50) DEFAULT 'active',
        \`created_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`updated_by\` BIGINT UNSIGNED DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`organization_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 5. Salary Structures Table (16 Columns)
      CREATE TABLE IF NOT EXISTS \`salary_structures\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`structure_name\` VARCHAR(100) NOT NULL,
        \`structure_code\` VARCHAR(50) NULL,
        \`description\` TEXT NULL,
        \`applicable_to_designation_id\` BIGINT UNSIGNED NULL,
        \`applicable_to_location_id\` BIGINT UNSIGNED NULL,
        \`effective_from\` DATE NOT NULL DEFAULT '2026-01-01',
        \`effective_to\` DATE NULL,
        \`status\` ENUM('active', 'inactive') DEFAULT 'active',
        \`created_by\` BIGINT UNSIGNED NULL DEFAULT 1,
        \`updated_by\` BIGINT UNSIGNED NULL DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` TIMESTAMP NULL,
        INDEX (\`organization_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 6. Salary Structure Components Table (21 Columns)
      CREATE TABLE IF NOT EXISTS \`salary_structure_components\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`structure_id\` BIGINT UNSIGNED NOT NULL,
        \`component_id\` BIGINT UNSIGNED NOT NULL,
        \`sort_order\` INT NOT NULL DEFAULT 0,
        \`created_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`updated_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`employee_id\` BIGINT UNSIGNED NULL,
        \`annual_ctc\` DECIMAL(15,2) NULL,
        \`basic_monthly\` DECIMAL(15,2) NULL,
        \`hra_monthly\` DECIMAL(15,2) NULL,
        \`special_allowance_monthly\` DECIMAL(15,2) NULL,
        \`gross_monthly\` DECIMAL(15,2) NULL,
        \`pf_deduction\` DECIMAL(15,2) NULL,
        \`esi_deduction\` DECIMAL(15,2) NULL,
        \`tds_deduction\` DECIMAL(15,2) NULL,
        \`net_take_home\` DECIMAL(15,2) NULL,
        \`grade_code\` VARCHAR(100) NULL,
        INDEX (\`organization_id\`),
        INDEX (\`structure_id\`),
        INDEX (\`component_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 7. Employee Salary Structures Table
      CREATE TABLE IF NOT EXISTS \`employee_salary_structures\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`employee_id\` BIGINT UNSIGNED NOT NULL,
        \`salary_structure_id\` BIGINT UNSIGNED NOT NULL,
        \`effective_from\` DATE NOT NULL DEFAULT '2026-01-01',
        \`effective_to\` DATE NULL,
        \`is_current\` TINYINT(1) DEFAULT 1,
        \`created_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`updated_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` TIMESTAMP NULL,
        INDEX (\`organization_id\`),
        INDEX (\`employee_id\`),
        INDEX (\`salary_structure_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 8. Payroll Runs Table
      CREATE TABLE IF NOT EXISTS \`payroll_runs\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`payroll_cycle_id\` BIGINT UNSIGNED NOT NULL,
        \`run_type\` VARCHAR(50) DEFAULT 'regular',
        \`run_month\` VARCHAR(10) NOT NULL,
        \`status\` VARCHAR(50) DEFAULT 'draft',
        \`total_employees\` INT DEFAULT 0,
        \`processed_employees\` INT DEFAULT 0,
        \`error_count\` INT DEFAULT 0,
        \`created_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`updated_by\` BIGINT UNSIGNED DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`organization_id\`),
        INDEX (\`run_month\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 9. Payroll Run Employees Table
      CREATE TABLE IF NOT EXISTS \`payroll_run_employees\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`payroll_run_id\` BIGINT UNSIGNED NOT NULL,
        \`employee_id\` BIGINT UNSIGNED NOT NULL,
        \`working_days\` INT DEFAULT 30,
        \`basic_salary\` DECIMAL(15,2) DEFAULT 0.00,
        \`gross_salary\` DECIMAL(15,2) DEFAULT 0.00,
        \`total_earnings\` DECIMAL(15,2) DEFAULT 0.00,
        \`total_deductions\` DECIMAL(15,2) DEFAULT 0.00,
        \`net_salary\` DECIMAL(15,2) DEFAULT 0.00,
        \`tax_deducted\` DECIMAL(15,2) DEFAULT 0.00,
        \`status\` VARCHAR(50) DEFAULT 'processed',
        \`created_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`updated_by\` BIGINT UNSIGNED DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`organization_id\`),
        INDEX (\`payroll_run_id\`),
        INDEX (\`employee_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 10. Payroll Earnings Table
      CREATE TABLE IF NOT EXISTS \`payroll_earnings\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`payroll_run_employee_id\` BIGINT UNSIGNED NOT NULL,
        \`component_id\` BIGINT UNSIGNED NOT NULL,
        \`actual_value\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`calculated_value\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`payroll_run_employee_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 11. Payroll Deductions Table
      CREATE TABLE IF NOT EXISTS \`payroll_deductions\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`payroll_run_employee_id\` BIGINT UNSIGNED NOT NULL,
        \`component_id\` BIGINT UNSIGNED NOT NULL,
        \`actual_value\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`calculated_value\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`payroll_run_employee_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 12. Payslips Table
      CREATE TABLE IF NOT EXISTS \`payslips\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`employee_id\` BIGINT UNSIGNED NOT NULL,
        \`payroll_run_id\` BIGINT UNSIGNED NULL,
        \`payslip_month\` DATE NOT NULL,
        \`payslip_number\` VARCHAR(100) NOT NULL,
        \`ctc\` DECIMAL(15,2) DEFAULT 0.00,
        \`basic_salary\` DECIMAL(15,2) DEFAULT 0.00,
        \`gross_salary\` DECIMAL(15,2) DEFAULT 0.00,
        \`total_deductions\` DECIMAL(15,2) DEFAULT 0.00,
        \`net_salary\` DECIMAL(15,2) DEFAULT 0.00,
        \`is_locked\` TINYINT(1) DEFAULT 1,
        \`created_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`updated_by\` BIGINT UNSIGNED DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`organization_id\`),
        INDEX (\`employee_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 13. Employee Loans Table
      CREATE TABLE IF NOT EXISTS \`employee_loans\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`employee_id\` BIGINT UNSIGNED NOT NULL,
        \`loan_type\` VARCHAR(50) NOT NULL DEFAULT 'salary_advance',
        \`loan_amount\` DECIMAL(15,2) DEFAULT 30000.00,
        \`total_amount_with_interest\` DECIMAL(15,2) DEFAULT 30000.00,
        \`amount\` DECIMAL(15,2) DEFAULT 30000.00,
        \`emi\` DECIMAL(15,2) DEFAULT 5000.00,
        \`monthly_emi\` DECIMAL(15,2) DEFAULT 5000.00,
        \`tenure_months\` INT NOT NULL DEFAULT 1,
        \`interest_rate\` DECIMAL(5,2) DEFAULT 0.00,
        \`reason\` TEXT,
        \`status\` VARCHAR(50) DEFAULT 'active',
        \`created_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`updated_by\` BIGINT UNSIGNED DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`organization_id\`),
        INDEX (\`employee_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 14. Loan Repayment Schedules Table
      CREATE TABLE IF NOT EXISTS \`loan_repayment_schedules\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`employee_loan_id\` BIGINT UNSIGNED NOT NULL,
        \`installment_number\` INT NOT NULL,
        \`due_date\` DATE NOT NULL,
        \`principal_amount\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`interest_amount\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`total_installment\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`status\` VARCHAR(50) DEFAULT 'pending',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`employee_loan_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 15. Tax Declarations Table
      CREATE TABLE IF NOT EXISTS \`tax_declarations\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`employee_id\` BIGINT UNSIGNED NOT NULL,
        \`financial_year\` VARCHAR(10) NOT NULL,
        \`pan_number\` VARCHAR(20) NULL,
        \`declaration_date\` DATE NOT NULL DEFAULT (CURRENT_DATE),
        \`status\` VARCHAR(50) DEFAULT 'pending',
        \`created_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`updated_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` TIMESTAMP NULL,
        INDEX (\`organization_id\`),
        INDEX (\`employee_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 16. Attendance Locks Table
      CREATE TABLE IF NOT EXISTS \`attendance_locks\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`salary_month\` VARCHAR(10) NOT NULL,
        \`total_employees\` INT DEFAULT 0,
        \`locked_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`status\` VARCHAR(50) DEFAULT 'locked',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`organization_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.query(sql);

    console.log('\n✨ ============================================================');
    console.log('🎉 ALL 16 Payroll Module Tables Created / Verified Successfully!');
    console.log('============================================================ ✨\n');

  } catch (err) {
    console.error('❌ Error creating Payroll DB tables:', err);
  } finally {
    await connection.end();
  }
}

createPayrollTables();