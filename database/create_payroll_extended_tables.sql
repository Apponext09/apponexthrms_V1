-- ============================================================
-- EXTENDED PAYROLL MODULE TABLES
-- ============================================================

-- 1. Payroll Policies Configuration Table
CREATE TABLE IF NOT EXISTS `payroll_policies` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `policy_name` VARCHAR(255) NOT NULL,
  `pay_cycle_type` ENUM('monthly', 'bi_weekly', 'semi_monthly') DEFAULT 'monthly',
  `pay_calculation_basis` ENUM('calendar_days', 'working_days_26', 'working_days_fixed') DEFAULT 'calendar_days',
  `fixed_working_days` INT DEFAULT 26,
  `cutoff_day` INT DEFAULT 25,
  `pay_day` INT DEFAULT 1,
  `lop_deduction_formula` ENUM('gross_divided_by_days', 'basic_divided_by_days') DEFAULT 'gross_divided_by_days',
  `overtime_rate_multiplier` DECIMAL(5,2) DEFAULT 1.50,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  INDEX (`organization_id`),
  INDEX (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Employee Loans & Salary Advances Table
CREATE TABLE IF NOT EXISTS `employee_loans` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `loan_type` ENUM('salary_advance', 'personal_loan', 'emergency_loan', 'asset_loan') NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `tenure_months` INT NOT NULL DEFAULT 1,
  `interest_rate` DECIMAL(5,2) DEFAULT 0.00,
  `monthly_emi` DECIMAL(15,2) NOT NULL,
  `disbursed_amount` DECIMAL(15,2),
  `disbursed_date` DATE,
  `reason` TEXT,
  `status` ENUM('pending', 'approved', 'rejected', 'disbursed', 'active', 'completed') DEFAULT 'pending',
  `approved_by` BIGINT UNSIGNED,
  `approved_at` TIMESTAMP NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  INDEX (`organization_id`),
  INDEX (`employee_id`),
  INDEX (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Loan EMI Repayment Installments Table
CREATE TABLE IF NOT EXISTS `loan_installments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `loan_id` BIGINT UNSIGNED NOT NULL,
  `payroll_processing_id` BIGINT UNSIGNED NULL,
  `installment_number` INT NOT NULL,
  `due_date` DATE NOT NULL,
  `emi_amount` DECIMAL(15,2) NOT NULL,
  `principal_amount` DECIMAL(15,2),
  `interest_amount` DECIMAL(15,2),
  `status` ENUM('pending', 'deducted', 'skipped', 'paid_manually') DEFAULT 'pending',
  `deducted_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`loan_id`) REFERENCES `employee_loans`(`id`) ON DELETE CASCADE,
  INDEX (`loan_id`),
  INDEX (`status`),
  INDEX (`due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Employee Tax & Investment Declarations Table
CREATE TABLE IF NOT EXISTS `tax_declarations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `financial_year` VARCHAR(10) NOT NULL,
  `regime` ENUM('new', 'old') NOT NULL DEFAULT 'new',
  `section_80c` DECIMAL(15,2) DEFAULT 0.00,
  `section_80d` DECIMAL(15,2) DEFAULT 0.00,
  `hra_rent_paid_annual` DECIMAL(15,2) DEFAULT 0.00,
  `landlord_name` VARCHAR(255),
  `landlord_pan` VARCHAR(20),
  `home_loan_interest_24b` DECIMAL(15,2) DEFAULT 0.00,
  `nps_80ccd_1b` DECIMAL(15,2) DEFAULT 0.00,
  `other_deductions_json` JSON,
  `proof_documents_json` JSON,
  `status` ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
  `reviewed_by` BIGINT UNSIGNED,
  `reviewed_at` TIMESTAMP NULL,
  `remarks` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_emp_fy` (`employee_id`, `financial_year`),
  INDEX (`organization_id`),
  INDEX (`employee_id`),
  INDEX (`financial_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Full & Final Settlement (F&F) Table
CREATE TABLE IF NOT EXISTS `full_and_final_settlements` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `resignation_date` DATE NOT NULL,
  `exit_date` DATE NOT NULL,
  `notice_period_days` INT DEFAULT 30,
  `served_notice_days` INT DEFAULT 30,
  `notice_shortfall_days` INT DEFAULT 0,
  `notice_pay_deduction` DECIMAL(15,2) DEFAULT 0.00,
  `leave_encashment_days` DECIMAL(5,2) DEFAULT 0.00,
  `leave_encashment_amount` DECIMAL(15,2) DEFAULT 0.00,
  `gratuity_amount` DECIMAL(15,2) DEFAULT 0.00,
  `pending_salary_amount` DECIMAL(15,2) DEFAULT 0.00,
  `pending_expense_claims` DECIMAL(15,2) DEFAULT 0.00,
  `asset_recovery_deductions` DECIMAL(15,2) DEFAULT 0.00,
  `other_deductions` DECIMAL(15,2) DEFAULT 0.00,
  `net_settlement_amount` DECIMAL(15,2) DEFAULT 0.00,
  `status` ENUM('draft', 'submitted', 'approved', 'processed', 'paid') DEFAULT 'draft',
  `approved_by` BIGINT UNSIGNED,
  `approved_at` TIMESTAMP NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  INDEX (`organization_id`),
  INDEX (`employee_id`),
  INDEX (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
