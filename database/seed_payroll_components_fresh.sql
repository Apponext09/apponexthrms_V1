-- ============================================================
-- PAYROLL COMPONENT RESET & FRESH SEED
-- Removes ALL existing groups + components and inserts
-- clean standard groups with EMPTY components.
-- User will configure values/formulas via the UI.
--
-- Safe to run: uses transactions + FK disable
-- organization_id = 8 (your live org)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ── Step 1: Clear bridge + child tables first ─────────────────
DELETE FROM `payroll_slab_components`;
DELETE FROM `payroll_earnings`    WHERE `component_id` IS NOT NULL;
DELETE FROM `payroll_deductions`  WHERE `component_id` IS NOT NULL;
DELETE FROM `payroll_components`;
DELETE FROM `payroll_component_groups`;

-- Reset AUTO_INCREMENT so IDs start from 1 cleanly
ALTER TABLE `payroll_component_groups` AUTO_INCREMENT = 1;
ALTER TABLE `payroll_components`       AUTO_INCREMENT = 1;

-- ── Step 2: Insert Component Groups ──────────────────────────
-- Group 1: Earnings
INSERT INTO `payroll_component_groups`
  (`uuid`, `organization_id`, `company_id`, `name`, `category`,
   `round_format`, `group_function`, `configure_on_profile`,
   `display_on_profile`, `is_editable`, `contributed_by`,
   `is_active`, `recalculate_on_change`, `group_for_payslip`,
   `display_order`, `disable_arrear`, `display_total_on_process`,
   `tds_same_month`, `is_taxable`, `created_at`, `updated_at`)
VALUES
  (UUID(), 8, NULL, 'Standard Earnings', 'Earning',
   'Round', 'Sum', 1,
   1, 1, 'Employee',
   1, 0, 'Earnings',
   1, 0, 1,
   0, 1, NOW(), NOW());

-- Group 2: Deductions
INSERT INTO `payroll_component_groups`
  (`uuid`, `organization_id`, `company_id`, `name`, `category`,
   `round_format`, `group_function`, `configure_on_profile`,
   `display_on_profile`, `is_editable`, `contributed_by`,
   `is_active`, `recalculate_on_change`, `group_for_payslip`,
   `display_order`, `disable_arrear`, `display_total_on_process`,
   `tds_same_month`, `is_taxable`, `created_at`, `updated_at`)
VALUES
  (UUID(), 8, NULL, 'Statutory Deductions', 'Deduction',
   'Round', 'Sum', 1,
   1, 0, 'Employee',
   1, 0, 'Deductions',
   2, 0, 1,
   0, 0, NOW(), NOW());

-- ── Step 3: Capture new group IDs ────────────────────────────
SET @earnings_group_id   = (SELECT id FROM `payroll_component_groups` WHERE name = 'Standard Earnings'   AND organization_id = 8 LIMIT 1);
SET @deductions_group_id = (SELECT id FROM `payroll_component_groups` WHERE name = 'Statutory Deductions' AND organization_id = 8 LIMIT 1);

-- ── Step 4: Insert Components (EMPTY — user fills via UI) ─────
-- component_type = 'Value', amount = 0, formula = NULL
-- User will edit each one in the Component settings screen

-- EARNINGS (8 components)
INSERT INTO `payroll_components`
  (`uuid`, `organization_id`, `company_id`, `group_id`, `name`,
   `non_cashable`, `based_on_attendance`, `is_active`,
   `component_type`, `amount`, `formula`,
   `boundary_type`, `min_amount`, `max_amount`,
   `gender_filter`, `created_at`, `updated_at`)
VALUES
  -- 1. Basic Salary
  (UUID(), 8, NULL, @earnings_group_id, 'Basic Salary',
   0, 1, 1, 'Value', 0, NULL, 'Choose', 0, 0, 'All', NOW(), NOW()),

  -- 2. House Rent Allowance (HRA)
  (UUID(), 8, NULL, @earnings_group_id, 'House Rent Allowance (HRA)',
   0, 1, 1, 'Value', 0, NULL, 'Choose', 0, 0, 'All', NOW(), NOW()),

  -- 3. Special Allowance
  (UUID(), 8, NULL, @earnings_group_id, 'Special Allowance',
   0, 1, 1, 'Value', 0, NULL, 'Choose', 0, 0, 'All', NOW(), NOW()),

  -- 4. Conveyance Allowance
  (UUID(), 8, NULL, @earnings_group_id, 'Conveyance Allowance',
   0, 0, 1, 'Value', 0, NULL, 'Choose', 0, 0, 'All', NOW(), NOW()),

  -- 5. Leave Travel Allowance (LTA)
  (UUID(), 8, NULL, @earnings_group_id, 'Leave Travel Allowance (LTA)',
   0, 0, 1, 'Value', 0, NULL, 'Choose', 0, 0, 'All', NOW(), NOW()),

  -- 6. Medical Allowance
  (UUID(), 8, NULL, @earnings_group_id, 'Medical Allowance',
   0, 0, 1, 'Value', 0, NULL, 'Choose', 0, 0, 'All', NOW(), NOW()),

  -- 7. Overtime Pay
  (UUID(), 8, NULL, @earnings_group_id, 'Overtime Pay',
   0, 1, 1, 'Value', 0, NULL, 'Choose', 0, 0, 'All', NOW(), NOW()),

  -- 8. Performance Bonus
  (UUID(), 8, NULL, @earnings_group_id, 'Performance Bonus',
   0, 0, 1, 'Value', 0, NULL, 'Choose', 0, 0, 'All', NOW(), NOW());

-- DEDUCTIONS (4 components)
INSERT INTO `payroll_components`
  (`uuid`, `organization_id`, `company_id`, `group_id`, `name`,
   `non_cashable`, `based_on_attendance`, `is_active`,
   `component_type`, `amount`, `formula`,
   `boundary_type`, `min_amount`, `max_amount`,
   `gender_filter`, `created_at`, `updated_at`)
VALUES
  -- 9. Employee Provident Fund (EPF)
  (UUID(), 8, NULL, @deductions_group_id, 'Employee Provident Fund (EPF)',
   0, 1, 1, 'Value', 0, NULL, 'Choose', 0, 0, 'All', NOW(), NOW()),

  -- 10. Employee State Insurance (ESIC)
  (UUID(), 8, NULL, @deductions_group_id, 'Employee State Insurance (ESIC)',
   0, 1, 1, 'Value', 0, NULL, 'Choose', 0, 0, 'All', NOW(), NOW()),

  -- 11. Professional Tax (PT)
  (UUID(), 8, NULL, @deductions_group_id, 'Professional Tax (PT)',
   0, 0, 1, 'Value', 0, NULL, 'Choose', 0, 0, 'All', NOW(), NOW()),

  -- 12. Tax Deducted at Source (TDS)
  (UUID(), 8, NULL, @deductions_group_id, 'Tax Deducted at Source (TDS)',
   0, 0, 1, 'Value', 0, NULL, 'Choose', 0, 0, 'All', NOW(), NOW());

-- ── Step 5: Collect all new component IDs ────────────────────
SET @all_component_ids = (
  SELECT JSON_ARRAYAGG(CAST(id AS CHAR))
  FROM `payroll_components`
  WHERE organization_id = 8
  ORDER BY id ASC
);

-- ── Step 6: Update both slabs to reference ALL new components ─
UPDATE `payroll_slabs`
SET
  `selected_component_ids` = @all_component_ids,
  `updated_at` = NOW()
WHERE `organization_id` = 8;

-- ── Step 7: Re-enable FK checks ──────────────────────────────
SET FOREIGN_KEY_CHECKS = 1;

-- ── Verify ────────────────────────────────────────────────────
SELECT 'GROUPS' AS type, id, name, category
FROM `payroll_component_groups`
WHERE organization_id = 8
ORDER BY display_order;

SELECT 'COMPONENTS' AS type, pc.id, pc.name,
       pc.component_type, pcg.category
FROM `payroll_components` pc
JOIN `payroll_component_groups` pcg ON pc.group_id = pcg.id
WHERE pc.organization_id = 8
ORDER BY pcg.display_order, pc.id;

SELECT 'SLABS UPDATED' AS info, id, name, selected_component_ids
FROM `payroll_slabs`
WHERE organization_id = 8;

SELECT '✅ Fresh component seed complete! Configure values via UI.' AS status;
-- ============================================================
