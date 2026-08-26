-- ============================================================
-- PAYROLL DB PATCH v2 — patch_payroll_v2.sql
-- Run AFTER patch_payroll_columns.sql
-- Safe to re-run: every statement uses IF NOT EXISTS / IF EXISTS
-- Found by: End-to-end payroll chain audit (2026-08-25)
-- ============================================================

-- ── FIX 1: payroll_components — module_source column missing ─
-- Code at PayrollService.ts reads comp.module_source to route
-- Module-type components: loan_emi, lop, tds, overtime,
-- late_deduction, salary_advance
-- Without this column, INSERT of new Module components fails
-- in MySQL strict mode and routing returns 0 for all Module types.
ALTER TABLE `payroll_components`
  ADD COLUMN IF NOT EXISTS `module_source` VARCHAR(100) NULL
  COMMENT 'loan_emi | lop | tds | overtime | late_deduction | salary_advance — used when component_type = Module';

-- ── FIX 2: payroll_earnings — remaining missing columns ───────
-- The patch_payroll_columns.sql already added component_name,
-- group_name, formula_used, is_non_cashable. This ensures they
-- exist even if that patch was not run first.
ALTER TABLE `payroll_earnings`
  ADD COLUMN IF NOT EXISTS `component_name`  VARCHAR(255)  NULL    COMMENT 'Human-readable earning name e.g. Basic Salary',
  ADD COLUMN IF NOT EXISTS `group_name`      VARCHAR(255)  NULL    COMMENT 'Parent group name e.g. Standard Earnings',
  ADD COLUMN IF NOT EXISTS `formula_used`    TEXT          NULL    COMMENT 'Formula expression used to compute this row',
  ADD COLUMN IF NOT EXISTS `is_non_cashable` TINYINT(1)   DEFAULT 0 COMMENT '1 = in CTC but not paid in cash (e.g. Employer PF)';

-- Make component_id nullable (system rows like TDS/Arrears have no component_id)
ALTER TABLE `payroll_earnings`
  MODIFY COLUMN `component_id` BIGINT UNSIGNED NULL;

-- ── FIX 3: payroll_deductions — component_name safety ─────────
-- Already added by patch v1, kept here for safety
ALTER TABLE `payroll_deductions`
  ADD COLUMN IF NOT EXISTS `component_name` VARCHAR(255) NULL
  COMMENT 'Human-readable deduction label e.g. PF, TDS, Loan EMI';

ALTER TABLE `payroll_deductions`
  MODIFY COLUMN `component_id` BIGINT UNSIGNED NULL;

-- ── FIX 4: payroll_run_employees — missing audit columns ──────
-- leave_days, paid_leave_days, tax_deducted never written by engine
ALTER TABLE `payroll_run_employees`
  ADD COLUMN IF NOT EXISTS `leave_days`       DECIMAL(6,2) DEFAULT 0.00 COMMENT 'Total leave days in the payroll period',
  ADD COLUMN IF NOT EXISTS `paid_leave_days`  DECIMAL(6,2) DEFAULT 0.00 COMMENT 'Paid leave days (no deduction applied)',
  ADD COLUMN IF NOT EXISTS `tax_deducted`     DECIMAL(15,2) DEFAULT 0.00 COMMENT 'TDS deducted this payroll run',
  ADD COLUMN IF NOT EXISTS `overtime_hours`   DECIMAL(6,2) DEFAULT 0.00 COMMENT 'Overtime hours worked in this period',
  ADD COLUMN IF NOT EXISTS `processed_at`     DATETIME NULL COMMENT 'Timestamp of successful salary processing',
  ADD COLUMN IF NOT EXISTS `processing_notes` TEXT NULL COMMENT 'Engine debug notes: components, LOP, warnings';

-- Fix status default — pending is correct starting value
ALTER TABLE `payroll_run_employees`
  MODIFY COLUMN `status` ENUM('pending','processed','error') DEFAULT 'pending';

-- ── FIX 5: payslips — YTD columns default safety ──────────────
-- ytd_gross, ytd_tax, ytd_net already in DB as NOT NULL DEFAULT 0
-- This ensures they can never cause INSERT failures
ALTER TABLE `payslips`
  MODIFY COLUMN `ytd_gross` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  MODIFY COLUMN `ytd_tax`   DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  MODIFY COLUMN `ytd_net`   DECIMAL(15,2) NOT NULL DEFAULT 0.00;

-- Ensure is_locked defaults to 0 (preview payslips must NOT be locked)
ALTER TABLE `payslips`
  MODIFY COLUMN `is_locked` TINYINT(1) DEFAULT 0;

-- ── FIX 6: payroll_slabs — safety check ───────────────────────
-- selected_component_ids stores JSON array of component IDs
-- Ensure it can hold large arrays
ALTER TABLE `payroll_slabs`
  MODIFY COLUMN `selected_component_ids` TEXT NULL
  COMMENT 'JSON array of payroll_component IDs assigned to this slab';

-- ── FIX 7: salary_structures — slab_id and cycle_id ──────────
-- Ensure these FK-like columns exist (added by v1 but safety check)
ALTER TABLE `salary_structures`
  ADD COLUMN IF NOT EXISTS `slab_id`  BIGINT UNSIGNED NULL COMMENT 'Payroll slab this structure is under',
  ADD COLUMN IF NOT EXISTS `cycle_id` BIGINT UNSIGNED NULL COMMENT 'Payroll cycle this structure belongs to';

-- ── FIX 8: payroll_slab_components — add org_id for isolation ─
-- Bridge table used by slab ↔ component mapping
-- Ensure organization_id exists for multi-tenant safety
ALTER TABLE `payroll_slab_components`
  ADD COLUMN IF NOT EXISTS `organization_id` BIGINT UNSIGNED NULL COMMENT 'Tenant isolation';

-- ── INDEXES: Performance on common queries ────────────────────
-- payroll_earnings: fast lookup by run employee
ALTER TABLE `payroll_earnings`
  ADD INDEX IF NOT EXISTS `idx_pe_run_emp`  (`payroll_run_employee_id`),
  ADD INDEX IF NOT EXISTS `idx_pe_comp_id`  (`component_id`);

-- payroll_deductions: fast lookup by run employee
ALTER TABLE `payroll_deductions`
  ADD INDEX IF NOT EXISTS `idx_pd_run_emp`  (`payroll_run_employee_id`),
  ADD INDEX IF NOT EXISTS `idx_pd_comp_id`  (`component_id`);

-- payroll_components: fast lookup by org + active
ALTER TABLE `payroll_components`
  ADD INDEX IF NOT EXISTS `idx_pc_org_active` (`organization_id`, `is_active`);

-- payroll_slabs: fast CTC range lookup
ALTER TABLE `payroll_slabs`
  ADD INDEX IF NOT EXISTS `idx_ps_ctc_range` (`organization_id`, `min_ctc`, `max_ctc`);

-- payroll_run_employees: fast status sweep
ALTER TABLE `payroll_run_employees`
  ADD INDEX IF NOT EXISTS `idx_pre_run_status` (`payroll_run_id`, `status`);

-- ============================================================
SELECT '✅ Payroll v2 patch applied successfully!' AS status;
-- ============================================================
