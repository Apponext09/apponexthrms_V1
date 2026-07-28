const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, 'server', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'apponexthrms',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  multipleStatements: true
};

async function seedNewPayrollDatabase() {
  console.log('🚀 Starting Comprehensive Payroll & Compliance DB Migration & Seed...');
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    console.log(`Connected to MySQL database "${dbConfig.database}".`);

    // 1. Create Core Tables
    const schemaSQL = `
      -- 1. Salary Structure Templates
      CREATE TABLE IF NOT EXISTS \`salary_structure_templates\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`template_name\` VARCHAR(255) NOT NULL,
        \`applicable_scope\` VARCHAR(100) DEFAULT 'ALL',
        \`scope_value_id\` BIGINT UNSIGNED NULL,
        \`ctc_annual\` DECIMAL(15,2) NULL,
        \`is_ctc_driven\` BOOLEAN DEFAULT TRUE,
        \`status\` ENUM('active', 'inactive', 'archived') DEFAULT 'active',
        \`created_by\` BIGINT UNSIGNED DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 2. Pay Component Definitions (Rules Engine)
      CREATE TABLE IF NOT EXISTS \`pay_component_definitions\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`component_code\` VARCHAR(50) NOT NULL,
        \`component_name\` VARCHAR(255) NOT NULL,
        \`component_type\` ENUM('EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION', 'REIMBURSEMENT', 'STATUTORY') NOT NULL,
        \`calculation_type\` ENUM('FIXED_AMOUNT', 'PERCENTAGE_OF_COMPONENT', 'PERCENTAGE_OF_CTC', 'FORMULA_BASED', 'SLAB_BASED', 'ATTENDANCE_LINKED', 'EXTERNAL_LOOKUP') NOT NULL,
        \`formula_expression\` TEXT NULL,
        \`percentage_value\` DECIMAL(8,4) NULL,
        \`reference_component_id\` BIGINT UNSIGNED NULL,
        \`slab_table_id\` BIGINT UNSIGNED NULL,
        \`is_taxable\` BOOLEAN DEFAULT TRUE,
        \`is_part_of_pf_wage\` BOOLEAN DEFAULT FALSE,
        \`is_part_of_esi_wage\` BOOLEAN DEFAULT FALSE,
        \`is_prorated_by_attendance\` BOOLEAN DEFAULT TRUE,
        \`min_value\` DECIMAL(15,2) NULL,
        \`max_value\` DECIMAL(15,2) NULL,
        \`rounding_rule\` ENUM('ROUND_NEAREST', 'ROUND_UP', 'ROUND_DOWN', 'TRUNCATE') DEFAULT 'ROUND_NEAREST',
        \`display_order\` INT DEFAULT 1,
        \`effective_from\` DATE NULL,
        \`effective_to\` DATE NULL,
        \`applicable_country\` CHAR(2) DEFAULT 'IN',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 3. Slab Tables & Entries
      CREATE TABLE IF NOT EXISTS \`slab_tables\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`country_code\` CHAR(2) NOT NULL DEFAULT 'IN',
        \`region_code\` VARCHAR(50) NULL,
        \`calculation_mode\` ENUM('FLAT_AMOUNT', 'MARGINAL_PROGRESSIVE') DEFAULT 'FLAT_AMOUNT',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS \`slab_table_entries\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`slab_table_id\` BIGINT UNSIGNED NOT NULL,
        \`min_amount\` DECIMAL(15,2) NOT NULL,
        \`max_amount\` DECIMAL(15,2) NULL,
        \`rate_percentage\` DECIMAL(8,4) NULL,
        \`flat_amount\` DECIMAL(15,2) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 4. Employee Salary Structures (Assignment Mapping)
      CREATE TABLE IF NOT EXISTS \`employee_salary_structures\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`employee_id\` BIGINT UNSIGNED NOT NULL,
        \`template_id\` BIGINT UNSIGNED NULL,
        \`annual_ctc\` DECIMAL(15,2) NOT NULL,
        \`effective_from\` DATE NULL,
        \`effective_to\` DATE NULL,
        \`component_overrides\` JSON NULL,
        \`status\` ENUM('ACTIVE', 'SUPERSEDED') DEFAULT 'ACTIVE',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 5. Payroll Runs
      CREATE TABLE IF NOT EXISTS \`payroll_runs\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`entity_id\` BIGINT UNSIGNED NULL,
        \`period_month\` TINYINT NOT NULL,
        \`period_year\` SMALLINT NOT NULL,
        \`status\` ENUM('DRAFT', 'INPUTS_LOCKED', 'PROCESSING', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'LOCKED', 'DISBURSED', 'CANCELLED') DEFAULT 'DRAFT',
        \`total_gross\` DECIMAL(15,2) DEFAULT 0.00,
        \`total_deductions\` DECIMAL(15,2) DEFAULT 0.00,
        \`total_net\` DECIMAL(15,2) DEFAULT 0.00,
        \`total_employer_cost\` DECIMAL(15,2) DEFAULT 0.00,
        \`currency_code\` CHAR(3) DEFAULT 'INR',
        \`processed_by\` BIGINT UNSIGNED NULL,
        \`approved_by\` BIGINT UNSIGNED NULL,
        \`locked_at\` TIMESTAMP NULL,
        \`disbursed_at\` TIMESTAMP NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 6. Payslips & Payslip Component Lines
      CREATE TABLE IF NOT EXISTS \`payslips\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`payroll_run_id\` BIGINT UNSIGNED NULL,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`employee_id\` BIGINT UNSIGNED NOT NULL,
        \`paid_days\` DECIMAL(5,2) NOT NULL DEFAULT 30.00,
        \`lop_days\` DECIMAL(5,2) DEFAULT 0.00,
        \`ot_hours\` DECIMAL(6,2) DEFAULT 0.00,
        \`gross_earnings\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`total_deductions\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`net_pay\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`employer_cost_total\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`currency_code\` CHAR(3) DEFAULT 'INR',
        \`fx_rate\` DECIMAL(12,6) DEFAULT 1.000000,
        \`revision_number\` INT DEFAULT 1,
        \`payment_mode\` ENUM('BANK_TRANSFER', 'CHEQUE', 'CASH') DEFAULT 'BANK_TRANSFER',
        \`status\` ENUM('draft', 'approved', 'published', 'paid') DEFAULT 'draft',
        \`generated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS \`payslip_component_lines\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`payslip_id\` BIGINT UNSIGNED NOT NULL,
        \`component_id\` BIGINT UNSIGNED NULL,
        \`component_code\` VARCHAR(50) NOT NULL,
        \`component_name\` VARCHAR(255) NOT NULL,
        \`component_type\` ENUM('EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION', 'REIMBURSEMENT', 'STATUTORY') NOT NULL,
        \`computed_amount\` DECIMAL(15,2) NOT NULL,
        \`formula_snapshot\` TEXT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 7. Payroll Input Sources
      CREATE TABLE IF NOT EXISTS \`payroll_input_sources\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`payroll_run_id\` BIGINT UNSIGNED NOT NULL,
        \`employee_id\` BIGINT UNSIGNED NOT NULL,
        \`paid_days\` DECIMAL(5,2) NOT NULL DEFAULT 30.00,
        \`lop_days\` DECIMAL(5,2) DEFAULT 0.00,
        \`ot_hours\` DECIMAL(6,2) DEFAULT 0.00,
        \`night_shift_days\` DECIMAL(5,2) DEFAULT 0.00,
        \`approved_reimbursements\` DECIMAL(15,2) DEFAULT 0.00,
        \`loan_emi_deduction\` DECIMAL(15,2) DEFAULT 0.00,
        \`arrears_amount\` DECIMAL(15,2) DEFAULT 0.00,
        \`manual_adjustments\` JSON NULL,
        \`is_locked\` BOOLEAN DEFAULT FALSE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 8. Statutory Compliance Profiles
      CREATE TABLE IF NOT EXISTS \`statutory_compliance_profiles\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`profile_name\` VARCHAR(255) NOT NULL,
        \`country_code\` CHAR(2) NOT NULL DEFAULT 'IN',
        \`schemes_config\` JSON NOT NULL,
        \`is_active\` BOOLEAN DEFAULT TRUE,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 9. Employee Loans
      CREATE TABLE IF NOT EXISTS \`employee_loans\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`employee_id\` BIGINT UNSIGNED NOT NULL,
        \`loan_type\` ENUM('SALARY_ADVANCE', 'PERSONAL_LOAN', 'EMERGENCY_LOAN', 'ASSET_LOAN') NOT NULL,
        \`principal_amount\` DECIMAL(15,2) NOT NULL,
        \`interest_rate\` DECIMAL(5,2) DEFAULT 0.00,
        \`tenure_months\` INT NOT NULL DEFAULT 1,
        \`emi_amount\` DECIMAL(15,2) NOT NULL,
        \`outstanding_balance\` DECIMAL(15,2) NOT NULL,
        \`status\` ENUM('ACTIVE', 'CLOSED', 'WRITTEN_OFF') DEFAULT 'ACTIVE',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 10. Full & Final Settlements
      CREATE TABLE IF NOT EXISTS \`full_and_final_settlements\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`employee_id\` BIGINT UNSIGNED NOT NULL,
        \`last_working_day\` DATE NOT NULL,
        \`fnf_due_date\` DATE NOT NULL,
        \`pending_salary\` DECIMAL(15,2) DEFAULT 0.00,
        \`leave_encashment\` DECIMAL(15,2) DEFAULT 0.00,
        \`gratuity_amount\` DECIMAL(15,2) DEFAULT 0.00,
        \`bonus_prorata\` DECIMAL(15,2) DEFAULT 0.00,
        \`total_recoveries\` DECIMAL(15,2) DEFAULT 0.00,
        \`net_settlement_amount\` DECIMAL(15,2) NOT NULL,
        \`clearances_status\` JSON NOT NULL,
        \`status\` ENUM('INITIATED', 'PENDING_CLEARANCE', 'APPROVED', 'PAID') DEFAULT 'INITIATED',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 11. Tax Declarations
      CREATE TABLE IF NOT EXISTS \`tax_declarations\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`employee_id\` BIGINT UNSIGNED NOT NULL,
        \`financial_year\` VARCHAR(10) NOT NULL DEFAULT '2026-2027',
        \`tax_regime\` ENUM('OLD_REGIME', 'NEW_REGIME') DEFAULT 'NEW_REGIME',
        \`declared_deductions\` JSON NOT NULL,
        \`verified_deductions\` JSON NULL,
        \`status\` ENUM('SUBMITTED', 'VERIFIED', 'REJECTED') DEFAULT 'SUBMITTED',
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 12. Payroll Corrections
      CREATE TABLE IF NOT EXISTS \`payroll_corrections\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`original_payslip_id\` BIGINT UNSIGNED NOT NULL,
        \`adjustment_amount\` DECIMAL(15,2) NOT NULL,
        \`adjustment_type\` ENUM('ARREARS_PAYOUT', 'RECOVERY_DEDUCTION') NOT NULL,
        \`reason\` TEXT NOT NULL,
        \`requested_by\` BIGINT UNSIGNED NOT NULL,
        \`approved_by_hr\` BIGINT UNSIGNED NULL,
        \`approved_by_finance\` BIGINT UNSIGNED NULL,
        \`status\` ENUM('PENDING', 'APPROVED', 'APPLIED_TO_NEXT_RUN', 'REJECTED') DEFAULT 'PENDING',
        \`target_payroll_run_id\` BIGINT UNSIGNED NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 13. Payroll Audit Logs
      CREATE TABLE IF NOT EXISTS \`payroll_audit_logs\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`actor_id\` BIGINT UNSIGNED NOT NULL,
        \`action\` VARCHAR(100) NOT NULL,
        \`target_employee_id\` BIGINT UNSIGNED NULL,
        \`ip_address\` VARCHAR(45) NULL,
        \`details\` JSON NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.query(schemaSQL);
    console.log('✅ All 13 Extended Payroll Tables successfully created in MySQL!');

  } catch (err) {
    console.error('❌ Error during newpayseed.js execution:', err);
  } finally {
    if (connection) await connection.end();
    process.exit(0);
  }
}

seedNewPayrollDatabase();
