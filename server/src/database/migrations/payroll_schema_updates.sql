-- ============================================================================
-- APPONEXT HRMS - PAYROLL MODULE DATABASE MIGRATION SCRIPT
-- ============================================================================
-- Description: Complete SQL Migration Script for Payroll Master Settings,
--              Salary Structures, Pay Slabs, Cycles, Runs, Earnings & Deductions.
-- Author: ApponextHRMS Engineering Team
-- Date: 2026-08-07
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. PAYROLL CYCLES TABLE
CREATE TABLE IF NOT EXISTS `payroll_cycles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(64) UNIQUE,
  `organization_id` INT DEFAULT 1,
  `cycle_name` VARCHAR(100) NOT NULL,
  `frequency` VARCHAR(50) DEFAULT 'Monthly',
  `start_date` INT DEFAULT 1,
  `cutoff_day` INT DEFAULT 25,
  `month_offset` VARCHAR(20) DEFAULT 'Current',
  `disbursement_date` INT DEFAULT 1,
  `cap_amount` DECIMAL(12,2) DEFAULT 1000000.00,
  `is_daily_wages` TINYINT(1) DEFAULT 0,
  `daily_wages_include_paid_holidays` TINYINT(1) DEFAULT 0,
  `daily_wages_include_week_off` TINYINT(1) DEFAULT 0,
  `tolerance_enabled` TINYINT(1) DEFAULT 1,
  `tolerance_minutes` INT DEFAULT 15,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. PAYROLL COMPONENT GROUPS TABLE
CREATE TABLE IF NOT EXISTS `payroll_component_groups` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `organization_id` INT DEFAULT 1,
  `name` VARCHAR(100) NOT NULL,
  `category` ENUM('Earning', 'Deduction') DEFAULT 'Earning',
  `round_format` VARCHAR(50) DEFAULT 'Round',
  `group_function` VARCHAR(50) DEFAULT 'Sum',
  `configure_on_profile` TINYINT(1) DEFAULT 0,
  `display_on_profile` TINYINT(1) DEFAULT 1,
  `is_editable` TINYINT(1) DEFAULT 1,
  `contributed_by` VARCHAR(50) DEFAULT 'Employee',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. PAYROLL COMPONENT DEFINITIONS TABLE
CREATE TABLE IF NOT EXISTS `payroll_component_definitions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `group_id` INT NULL,
  `organization_id` INT DEFAULT 1,
  `name` VARCHAR(100) NOT NULL,
  `component_type` ENUM('Value', 'Derived', 'Module') DEFAULT 'Derived',
  `non_cashable` TINYINT(1) DEFAULT 0,
  `based_on_attendance` TINYINT(1) DEFAULT 1,
  `is_active` TINYINT(1) DEFAULT 1,
  `amount` DECIMAL(12,2) DEFAULT 0.00,
  `formula` TEXT NULL,
  `boundary_type` VARCHAR(50) DEFAULT 'Choose',
  `min_amount` DECIMAL(12,2) DEFAULT 0.00,
  `max_amount` DECIMAL(12,2) DEFAULT 0.00,
  `effective_from_date` DATE NULL,
  `effective_to_date` DATE NULL,
  `condition_on` VARCHAR(50) DEFAULT 'Choose',
  `condition_operator` VARCHAR(20) DEFAULT 'Choose',
  `condition_value1` VARCHAR(100) DEFAULT '',
  `condition_value2` VARCHAR(100) DEFAULT '',
  `gender_filter` VARCHAR(20) DEFAULT 'All',
  `grades` JSON NULL,
  `departments` JSON NULL,
  `locations` JSON NULL,
  `employees` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. PAYROLL SLABS TABLE
CREATE TABLE IF NOT EXISTS `payroll_slabs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `organization_id` INT DEFAULT 1,
  `slab_name` VARCHAR(100) NOT NULL,
  `min_ctc` DECIMAL(12,2) DEFAULT 0.00,
  `max_ctc` DECIMAL(12,2) DEFAULT 10000000.00,
  `cycle_id` VARCHAR(64) DEFAULT '',
  `employment_type` VARCHAR(50) DEFAULT 'Regular',
  `departments` JSON NULL,
  `grades` JSON NULL,
  `locations` JSON NULL,
  `selected_component_ids` JSON NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. SALARY STRUCTURES TABLE (MASTER TEMPLATES & ASSIGNMENTS)
CREATE TABLE IF NOT EXISTS `salary_structures` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `organization_id` INT DEFAULT 1,
  `employee_id` INT NULL,
  `employee_code` VARCHAR(50) NULL,
  `employee_name` VARCHAR(100) NULL,
  `structure_name` VARCHAR(100) NOT NULL,
  `slab_name` VARCHAR(100) DEFAULT 'Standard CTC Slab',
  `grade_code` VARCHAR(50) DEFAULT 'GRADE-STD',
  `annual_ctc` DECIMAL(12,2) DEFAULT 0.00,
  `gross_monthly` DECIMAL(12,2) DEFAULT 0.00,
  `basic_monthly` DECIMAL(12,2) DEFAULT 0.00,
  `hra_monthly` DECIMAL(12,2) DEFAULT 0.00,
  `special_allowance_monthly` DECIMAL(12,2) DEFAULT 0.00,
  `pf_deduction` DECIMAL(12,2) DEFAULT 0.00,
  `esi_deduction` DECIMAL(12,2) DEFAULT 0.00,
  `tds_deduction` DECIMAL(12,2) DEFAULT 0.00,
  `net_take_home` DECIMAL(12,2) DEFAULT 0.00,
  `effective_from` DATE NULL,
  `status` VARCHAR(20) DEFAULT 'Active',
  `is_custom` TINYINT(1) DEFAULT 0,
  `custom_components` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. EMPLOYEE SALARY STRUCTURES LINK TABLE
CREATE TABLE IF NOT EXISTS `employee_salary_structures` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `organization_id` INT DEFAULT 1,
  `employee_id` INT NOT NULL,
  `salary_structure_id` INT NULL,
  `structure_name` VARCHAR(100) DEFAULT 'Standard Staff Structure',
  `annual_ctc` DECIMAL(12,2) DEFAULT 0.00,
  `gross_monthly` DECIMAL(12,2) DEFAULT 0.00,
  `basic_salary` DECIMAL(12,2) DEFAULT 0.00,
  `hra_monthly` DECIMAL(12,2) DEFAULT 0.00,
  `special_allowance_monthly` DECIMAL(12,2) DEFAULT 0.00,
  `pf_deduction` DECIMAL(12,2) DEFAULT 0.00,
  `esi_deduction` DECIMAL(12,2) DEFAULT 0.00,
  `tds_deduction` DECIMAL(12,2) DEFAULT 0.00,
  `net_take_home` DECIMAL(12,2) DEFAULT 0.00,
  `effective_from` DATE NULL,
  `status` VARCHAR(20) DEFAULT 'Active',
  `is_custom` TINYINT(1) DEFAULT 0,
  `custom_components` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_emp_id (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. PAYROLL RUNS TABLE (MONTHLY PAYOUT RUNS)
CREATE TABLE IF NOT EXISTS `payroll_runs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `organization_id` INT DEFAULT 1,
  `run_name` VARCHAR(100) NOT NULL,
  `year` INT NOT NULL,
  `month` INT NOT NULL,
  `cycle_id` INT NULL,
  `total_employees` INT DEFAULT 0,
  `total_gross_payout` DECIMAL(14,2) DEFAULT 0.00,
  `total_net_payout` DECIMAL(14,2) DEFAULT 0.00,
  `status` ENUM('draft', 'processing', 'locked', 'approved', 'published') DEFAULT 'draft',
  `approved_by` INT NULL,
  `approved_at` DATETIME NULL,
  `published_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. PAYROLL EARNINGS ITEMIZED TABLE
CREATE TABLE IF NOT EXISTS `payroll_earnings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payroll_run_id` INT NOT NULL,
  `employee_id` INT NOT NULL,
  `component_name` VARCHAR(100) NOT NULL,
  `component_type` VARCHAR(50) DEFAULT 'Earning',
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. PAYROLL DEDUCTIONS ITEMIZED TABLE
CREATE TABLE IF NOT EXISTS `payroll_deductions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payroll_run_id` INT NOT NULL,
  `employee_id` INT NOT NULL,
  `component_name` VARCHAR(100) NOT NULL,
  `component_type` VARCHAR(50) DEFAULT 'Deduction',
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- SAFE ALTER COLUMN CHECKS (FOR EXISTING DB TABLES)
ALTER TABLE `salary_structures` ADD COLUMN IF NOT EXISTS `is_custom` TINYINT(1) DEFAULT 0;
ALTER TABLE `salary_structures` ADD COLUMN IF NOT EXISTS `custom_components` JSON NULL;
ALTER TABLE `employee_salary_structures` ADD COLUMN IF NOT EXISTS `is_custom` TINYINT(1) DEFAULT 0;
ALTER TABLE `employee_salary_structures` ADD COLUMN IF NOT EXISTS `custom_components` JSON NULL;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- END OF PAYROLL MIGRATION SCRIPT
-- ============================================================================
