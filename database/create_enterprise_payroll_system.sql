-- ============================================================
-- ENTERPRISE PAYROLL & COMPLIANCE SYSTEM DATABASE SCHEMA
-- ============================================================

-- 1. Pay Component Definitions Table (Earnings, Deductions, Employer Contributions, Reimbursements)
CREATE TABLE IF NOT EXISTS `pay_component_definitions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `component_type` ENUM('earning', 'deduction', 'employer_contribution', 'reimbursement') NOT NULL,
  `calculation_type` ENUM('fixed', 'percentage_of_basic', 'formula', 'slab_based', 'attendance_based') NOT NULL DEFAULT 'fixed',
  `formula_expression` TEXT NULL,
  `is_taxable` TINYINT(1) DEFAULT 1,
  `is_pf_applicable` TINYINT(1) DEFAULT 1,
  `is_esi_applicable` TINYINT(1) DEFAULT 1,
  `is_pt_applicable` TINYINT(1) DEFAULT 1,
  `is_statutory` TINYINT(1) DEFAULT 0,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_by` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_org_comp_code` (`organization_id`, `code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Salary Structure Templates Table
CREATE TABLE IF NOT EXISTS `salary_structure_templates` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `template_name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `grade_level` VARCHAR(100) NULL,
  `annual_ctc_min` DECIMAL(15,2) DEFAULT 0.00,
  `annual_ctc_max` DECIMAL(15,2) DEFAULT 0.00,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_by` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Template Component Mappings Table
CREATE TABLE IF NOT EXISTS `template_component_mappings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `template_id` BIGINT UNSIGNED NOT NULL,
  `component_id` BIGINT UNSIGNED NOT NULL,
  `percentage_value` DECIMAL(7,4) DEFAULT 0.0000,
  `fixed_amount` DECIMAL(15,2) DEFAULT 0.00,
  `sort_order` INT DEFAULT 1,
  FOREIGN KEY (`template_id`) REFERENCES `salary_structure_templates`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`component_id`) REFERENCES `pay_component_definitions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Attendance Locks Table
CREATE TABLE IF NOT EXISTS `attendance_locks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `salary_month` VARCHAR(10) NOT NULL,
  `total_employees` INT DEFAULT 0,
  `locked_by` BIGINT UNSIGNED NOT NULL,
  `locked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('locked', 'unlocked') DEFAULT 'locked',
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_org_month_lock` (`organization_id`, `salary_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Event-Sourced Payroll Ledger Entries Table
CREATE TABLE IF NOT EXISTS `payroll_ledger_entries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `payroll_run_id` BIGINT UNSIGNED NOT NULL,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `entry_type` ENUM('earning', 'deduction', 'employer_contribution', 'reimbursement', 'net_payout') NOT NULL,
  `component_code` VARCHAR(50) NOT NULL,
  `component_name` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `financial_year` VARCHAR(10) NOT NULL,
  `salary_month` VARCHAR(10) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  INDEX (`organization_id`),
  INDEX (`payroll_run_id`),
  INDEX (`employee_id`),
  INDEX (`salary_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Reimbursement Claims Table
CREATE TABLE IF NOT EXISTS `reimbursement_claims` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `claim_type` ENUM('travel', 'medical', 'telephone', 'fuel', 'office_supplies', 'other') NOT NULL,
  `claim_date` DATE NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `description` TEXT,
  `receipt_urls_json` JSON,
  `status` ENUM('pending', 'approved', 'rejected', 'processed_in_payroll') DEFAULT 'pending',
  `approved_by` BIGINT UNSIGNED,
  `approved_at` TIMESTAMP NULL,
  `payroll_run_id` BIGINT UNSIGNED NULL,
  `remarks` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  INDEX (`organization_id`),
  INDEX (`employee_id`),
  INDEX (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
