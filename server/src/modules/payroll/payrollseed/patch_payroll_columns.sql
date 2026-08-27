-- ============================================================
-- PAYROLL DB PATCH — patch_payroll_columns.sql
-- Run this BEFORE first payroll test / production go-live
-- Safe to re-run: uses IF NOT EXISTS on each column
-- Generated: 2026-08-25
-- ============================================================

-- ── 1. payroll_earnings ──────────────────────────────────────
-- component_id must allow NULL for system rows (TDS, Loan EMI, Arrears)
ALTER TABLE `payroll_earnings`
  MODIFY COLUMN `component_id` BIGINT UNSIGNED NULL;

ALTER TABLE `payroll_earnings`
  ADD COLUMN IF NOT EXISTS `component_name` VARCHAR(255)   NULL  COMMENT 'Human-readable component name (e.g. Basic Salary, HRA)',
  ADD COLUMN IF NOT EXISTS `group_name`     VARCHAR(255)   NULL  COMMENT 'Component group (e.g. Earnings, Allowances)',
  ADD COLUMN IF NOT EXISTS `formula_used`   TEXT           NULL  COMMENT 'Formula string used to compute this earning',
  ADD COLUMN IF NOT EXISTS `is_non_cashable` TINYINT(1)    DEFAULT 0 COMMENT '1 = counted in CTC but not paid in cash',
  ADD COLUMN IF NOT EXISTS `deleted_at`     TIMESTAMP      NULL;

-- ── 2. payroll_deductions ────────────────────────────────────
-- component_id must allow NULL for system-generated deduction rows
ALTER TABLE `payroll_deductions`
  MODIFY COLUMN `component_id` BIGINT UNSIGNED NULL;

ALTER TABLE `payroll_deductions`
  ADD COLUMN IF NOT EXISTS `component_name` VARCHAR(255) NULL COMMENT 'Human-readable deduction label (e.g. PF, TDS, Loan EMI)',
  ADD COLUMN IF NOT EXISTS `deleted_at`     TIMESTAMP   NULL;

-- ── 3. payroll_runs ──────────────────────────────────────────
ALTER TABLE `payroll_runs`
  ADD COLUMN IF NOT EXISTS `company_id`    BIGINT UNSIGNED  NULL     COMMENT 'Multi-company: which company this run belongs to',
  ADD COLUMN IF NOT EXISTS `locked_by`     BIGINT UNSIGNED  NULL     COMMENT 'FK users.id — HR who locked the run',
  ADD COLUMN IF NOT EXISTS `locked_at`     DATETIME         NULL     COMMENT 'Timestamp when run was locked',
  ADD COLUMN IF NOT EXISTS `approved_by`   BIGINT UNSIGNED  NULL     COMMENT 'FK users.id — CEO who approved',
  ADD COLUMN IF NOT EXISTS `approved_at`   DATETIME         NULL     COMMENT 'Timestamp of approval',
  ADD COLUMN IF NOT EXISTS `published_at`  DATETIME         NULL     COMMENT 'Timestamp of payslip publish',
  ADD COLUMN IF NOT EXISTS `deleted_at`    TIMESTAMP        NULL,
  ADD INDEX IF NOT EXISTS `idx_payroll_runs_company` (`company_id`),
  ADD INDEX IF NOT EXISTS `idx_payroll_runs_deleted` (`deleted_at`);

-- ── 4. payroll_run_employees ─────────────────────────────────
ALTER TABLE `payroll_run_employees`
  ADD COLUMN IF NOT EXISTS `leave_days`         INT           DEFAULT 0    COMMENT 'Total leave days in period',
  ADD COLUMN IF NOT EXISTS `paid_leave_days`    INT           DEFAULT 0    COMMENT 'Paid leave days (no deduction)',
  ADD COLUMN IF NOT EXISTS `unpaid_leave_days`  INT           DEFAULT 0    COMMENT 'LOP days (deducted from salary)',
  ADD COLUMN IF NOT EXISTS `overtime_hours`     DECIMAL(8,2)  DEFAULT 0.00 COMMENT 'OT hours worked',
  ADD COLUMN IF NOT EXISTS `processed_at`       DATETIME      NULL         COMMENT 'Timestamp of successful processing',
  ADD COLUMN IF NOT EXISTS `processing_notes`   TEXT          NULL         COMMENT 'Debug notes: components evaluated, LOP, warnings',
  ADD COLUMN IF NOT EXISTS `deleted_at`         TIMESTAMP     NULL;

-- Fix: old DDL defaulted status to 'processed' — new rows must start as 'pending'
ALTER TABLE `payroll_run_employees`
  MODIFY COLUMN `status` VARCHAR(50) DEFAULT 'pending';

-- ── 5. payslips ──────────────────────────────────────────────
-- Fix: is_locked DEFAULT 1 caused preview payslips from processPayroll to be immediately locked.
-- Must be 0 — only publishPayroll() sets it to 1.
ALTER TABLE `payslips`
  MODIFY COLUMN `is_locked` TINYINT(1) DEFAULT 0;

ALTER TABLE `payslips`
  ADD COLUMN IF NOT EXISTS `company_id`   BIGINT UNSIGNED NULL     COMMENT 'Multi-company isolation',
  ADD COLUMN IF NOT EXISTS `locked_at`    DATETIME        NULL     COMMENT 'Timestamp when payslip was locked by publishPayroll',
  ADD COLUMN IF NOT EXISTS `deleted_at`   TIMESTAMP       NULL,
  ADD INDEX IF NOT EXISTS `idx_payslips_company` (`company_id`);

-- ── 6. salary_structures ─────────────────────────────────────
-- processPayroll primary lookup: salary_structures WHERE employee_id = ?
-- Original DDL (salary_structures table) has no employee_id column.
-- Adding all fields that processPayroll reads off salary_structures rows.
ALTER TABLE `salary_structures`
  ADD COLUMN IF NOT EXISTS `employee_id`       BIGINT UNSIGNED  NULL    COMMENT 'Employee this structure belongs to',
  ADD COLUMN IF NOT EXISTS `slab_id`           BIGINT UNSIGNED  NULL    COMMENT 'Pay slab (CTC bracket) used',
  ADD COLUMN IF NOT EXISTS `cycle_id`          BIGINT UNSIGNED  NULL    COMMENT 'Payroll cycle this structure is linked to',
  ADD COLUMN IF NOT EXISTS `annual_ctc`        DECIMAL(15,2)    NULL    COMMENT 'Annual CTC in INR',
  ADD COLUMN IF NOT EXISTS `basic_monthly`     DECIMAL(15,2)    NULL    COMMENT 'Monthly Basic salary',
  ADD COLUMN IF NOT EXISTS `gross_monthly`     DECIMAL(15,2)    NULL    COMMENT 'Monthly Gross salary',
  ADD COLUMN IF NOT EXISTS `pf_employer`       DECIMAL(15,2)    NULL    COMMENT 'Employer PF contribution (display only)',
  ADD COLUMN IF NOT EXISTS `esic_employer`     DECIMAL(15,2)    NULL    COMMENT 'Employer ESIC contribution (display only)',
  ADD COLUMN IF NOT EXISTS `tds_deduction`     DECIMAL(15,2)    NULL    COMMENT 'Monthly TDS deduction override',
  ADD COLUMN IF NOT EXISTS `arrear_pay_month`  VARCHAR(10)      NULL    COMMENT 'YYYY-MM: run month to disburse backdated arrears',
  ADD INDEX IF NOT EXISTS `idx_salary_structures_employee` (`employee_id`),
  ADD INDEX IF NOT EXISTS `idx_salary_structures_slab` (`slab_id`);

-- ── 2. Audit Logs Tables ─────────────────────────────────────
-- Table 1: Dedicated Audit Logs for Component Groups
CREATE TABLE IF NOT EXISTS `payroll_component_group_audit_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `company_id` BIGINT UNSIGNED NULL,
  `group_id` BIGINT UNSIGNED NOT NULL,
  `group_name` VARCHAR(100) NOT NULL,
  `action` ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL DEFAULT 'UPDATE',
  `description` TEXT NOT NULL,
  `before_state` JSON NULL,
  `after_state` JSON NULL,
  `updated_by_id` BIGINT UNSIGNED NULL,
  `updated_by_name` VARCHAR(150) NOT NULL DEFAULT 'Admin',
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_group_audit_group_id` (`group_id`),
  INDEX `idx_group_audit_org_id` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 2: Dedicated Audit Logs for Individual Components
CREATE TABLE IF NOT EXISTS `payroll_component_audit_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `company_id` BIGINT UNSIGNED NULL,
  `component_id` BIGINT UNSIGNED NOT NULL,
  `component_name` VARCHAR(100) NOT NULL,
  `group_id` BIGINT UNSIGNED NULL,
  `action` ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL DEFAULT 'UPDATE',
  `description` TEXT NOT NULL,
  `before_state` JSON NULL,
  `after_state` JSON NULL,
  `updated_by_id` BIGINT UNSIGNED NULL,
  `updated_by_name` VARCHAR(150) NOT NULL DEFAULT 'Admin',
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_comp_audit_comp_id` (`component_id`),
  INDEX `idx_comp_audit_group_id` (`group_id`),
  INDEX `idx_comp_audit_group_id` (`group_id`),
  INDEX `idx_comp_audit_org_id` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
SELECT '✅ Payroll column patch applied successfully!' AS status;
-- ============================================================

