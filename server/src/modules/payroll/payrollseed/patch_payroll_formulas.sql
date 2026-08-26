-- ============================================================
-- PATCH: Payroll Component Formulas + Missing Components
-- Database : health  |  organization_id = 8
--
-- What this does:
--   1. Sets correct formulas on existing Derived components
--   2. Inserts missing components that appear in payslips
--      (Standard Allowance, Meal Allowance, Communication
--       Allowance, Children Education Allowance, Gross)
--   3. Links all new components to both existing slabs
--
-- Safe to run multiple times (uses INSERT IGNORE / UPDATE)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ── STEP 1: Set correct formulas on EXISTING Derived components ──

-- Basic Salary = 50% of monthly CTC
UPDATE `payroll_components`
SET
  `component_type`      = 'Derived',
  `formula`             = '[CTC] * 0.50',
  `based_on_attendance` = 1,
  `updated_at`          = NOW()
WHERE `name` = 'Basic Salary'
  AND `organization_id` = 8;

-- House Rent Allowance (HRA) = 40% of Basic Salary
UPDATE `payroll_components`
SET
  `component_type`      = 'Derived',
  `formula`             = '[Basic Salary] * 0.40',
  `based_on_attendance` = 1,
  `updated_at`          = NOW()
WHERE `name` = 'House Rent Allowance (HRA)'
  AND `organization_id` = 8;

-- Special Allowance = CTC - Basic - HRA  (balance filler to make sum = CTC)
UPDATE `payroll_components`
SET
  `component_type`      = 'Derived',
  `formula`             = '[CTC] - [Basic Salary] - [House Rent Allowance (HRA)]',
  `based_on_attendance` = 1,
  `updated_at`          = NOW()
WHERE `name` = 'Special Allowance'
  AND `organization_id` = 8;

-- Employee PF (EPF) = 12% of Basic, statutory cap ₹1,800/month (on ₹15,000 ceiling)
UPDATE `payroll_components`
SET
  `component_type`      = 'Derived',
  `formula`             = 'min(1800, [Basic Salary] * 0.12)',
  `based_on_attendance` = 1,
  `boundary_type`       = 'Max',
  `max_amount`          = 1800,
  `updated_at`          = NOW()
WHERE `name` = 'Employee PF (EPF)'
  AND `organization_id` = 8;

-- Employee ESIC = 0.75% of Gross (applicable when Gross <= 21000)
UPDATE `payroll_components`
SET
  `component_type`      = 'Derived',
  `formula`             = '[Gross] * 0.0075',
  `based_on_attendance` = 1,
  `updated_at`          = NOW()
WHERE `name` = 'Employee ESIC'
  AND `organization_id` = 8;

-- Employer PF Contribution = 12% of Basic, capped at ₹1,800
UPDATE `payroll_components`
SET
  `component_type`      = 'Derived',
  `formula`             = 'min(1800, [Basic Salary] * 0.12)',
  `based_on_attendance` = 1,
  `boundary_type`       = 'Max',
  `max_amount`          = 1800,
  `updated_at`          = NOW()
WHERE `name` = 'Employer PF Contribution'
  AND `organization_id` = 8;

-- Employer ESIC Contribution = 3.25% of Gross (applicable when Gross <= 21000)
UPDATE `payroll_components`
SET
  `component_type`      = 'Derived',
  `formula`             = '[Gross] * 0.0325',
  `based_on_attendance` = 1,
  `updated_at`          = NOW()
WHERE `name` = 'Employer ESIC Contribution'
  AND `organization_id` = 8;

-- Gratuity = Basic / 26 * 15 / 12  =>  Basic * 0.04808  (provisioned monthly)
UPDATE `payroll_components`
SET
  `component_type`      = 'Derived',
  `formula`             = '[Basic Salary] * 0.04808',
  `based_on_attendance` = 0,
  `updated_at`          = NOW()
WHERE `name` = 'Gratuity'
  AND `organization_id` = 8;

-- EDLI (Employer Insurance) = 0.5% of Basic, capped at ₹75/month
UPDATE `payroll_components`
SET
  `component_type`      = 'Derived',
  `formula`             = 'min(75, [Basic Salary] * 0.005)',
  `based_on_attendance` = 0,
  `boundary_type`       = 'Max',
  `max_amount`          = 75,
  `updated_at`          = NOW()
WHERE `name` = 'EDLI (Employer Insurance)'
  AND `organization_id` = 8;

-- ── STEP 2: Capture group IDs ────────────────────────────────────
SET @statutory_grp = (
  SELECT id FROM payroll_component_groups
  WHERE name = 'Statutory Allowances' AND organization_id = 8
  LIMIT 1
);
SET @special_grp = (
  SELECT id FROM payroll_component_groups
  WHERE name = 'Special Allowance' AND organization_id = 8
  LIMIT 1
);

-- ── STEP 3: Insert MISSING earning components ────────────────────

-- Standard Allowance (Value — flat fixed by company)
INSERT IGNORE INTO `payroll_components`
  (`uuid`, `organization_id`, `company_id`, `group_id`, `name`,
   `non_cashable`, `based_on_attendance`, `is_active`,
   `component_type`, `amount`, `formula`,
   `boundary_type`, `min_amount`, `max_amount`,
   `gender_filter`, `created_at`, `updated_at`)
VALUES (UUID(), 8, NULL, @statutory_grp, 'Standard Allowance',
        0, 1, 1, 'Value', 0, NULL,
        'Choose', 0, 0, 'All', NOW(), NOW());

-- Meal Allowance (Value — tax-exempt up to ₹26,400/yr)
INSERT IGNORE INTO `payroll_components`
  (`uuid`, `organization_id`, `company_id`, `group_id`, `name`,
   `non_cashable`, `based_on_attendance`, `is_active`,
   `component_type`, `amount`, `formula`,
   `boundary_type`, `min_amount`, `max_amount`,
   `gender_filter`, `created_at`, `updated_at`)
VALUES (UUID(), 8, NULL, @statutory_grp, 'Meal Allowance',
        0, 1, 1, 'Value', 0, NULL,
        'Choose', 0, 0, 'All', NOW(), NOW());

-- Communication Allowance (Value — fully taxable)
INSERT IGNORE INTO `payroll_components`
  (`uuid`, `organization_id`, `company_id`, `group_id`, `name`,
   `non_cashable`, `based_on_attendance`, `is_active`,
   `component_type`, `amount`, `formula`,
   `boundary_type`, `min_amount`, `max_amount`,
   `gender_filter`, `created_at`, `updated_at`)
VALUES (UUID(), 8, NULL, @statutory_grp, 'Communication Allowance',
        0, 0, 1, 'Value', 0, NULL,
        'Choose', 0, 0, 'All', NOW(), NOW());

-- Children Education Allowance (Value — ₹100/child/month, max 2 kids)
INSERT IGNORE INTO `payroll_components`
  (`uuid`, `organization_id`, `company_id`, `group_id`, `name`,
   `non_cashable`, `based_on_attendance`, `is_active`,
   `component_type`, `amount`, `formula`,
   `boundary_type`, `min_amount`, `max_amount`,
   `gender_filter`, `created_at`, `updated_at`)
VALUES (UUID(), 8, NULL, @statutory_grp, 'Children Education Allowance',
        0, 0, 1, 'Value', 0, NULL,
        'Choose', 0, 0, 'All', NOW(), NOW());

-- Gross (Derived — sum of all earning lines, used as base for ESIC / PF calcs)
INSERT IGNORE INTO `payroll_components`
  (`uuid`, `organization_id`, `company_id`, `group_id`, `name`,
   `non_cashable`, `based_on_attendance`, `is_active`,
   `component_type`, `amount`, `formula`,
   `boundary_type`, `min_amount`, `max_amount`,
   `gender_filter`, `created_at`, `updated_at`)
VALUES (UUID(), 8, NULL, @special_grp, 'Gross',
        0, 1, 1, 'Derived', 0,
        '[Basic Salary] + [House Rent Allowance (HRA)] + [Special Allowance]',
        'Choose', 0, 0, 'All', NOW(), NOW());

-- ── STEP 4: Update all slabs to include ALL components ───────────
SET @all_comp_ids = (
  SELECT JSON_ARRAYAGG(CAST(id AS CHAR))
  FROM `payroll_components`
  WHERE organization_id = 8
  ORDER BY id ASC
);

UPDATE `payroll_slabs`
SET `selected_component_ids` = @all_comp_ids,
    `updated_at`             = NOW()
WHERE `organization_id` = 8;

-- ── Re-enable FK checks ───────────────────────────────────────────
SET FOREIGN_KEY_CHECKS = 1;

-- ── Verify ────────────────────────────────────────────────────────
SELECT
  pcg.name          AS `Group`,
  pcg.category      AS `Category`,
  pc.id,
  pc.name           AS `Component`,
  pc.component_type AS `Type`,
  pc.formula        AS `Formula`,
  pc.amount         AS `Flat Amount`
FROM payroll_components pc
JOIN payroll_component_groups pcg ON pc.group_id = pcg.id
WHERE pc.organization_id = 8
ORDER BY pcg.display_order, pcg.id, pc.id;

SELECT '✅ Patch complete. Formulas set + 5 missing components added.' AS status;
-- ============================================================
