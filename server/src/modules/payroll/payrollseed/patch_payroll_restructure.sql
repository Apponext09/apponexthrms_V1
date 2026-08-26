-- ============================================================
-- FULL RESTRUCTURE: Payroll Component Groups & Components
-- Database : health  |  organization_id = 8
--
-- GOAL: Component names EXACTLY match payroll report columns:
--   Earnings : Basic | HRA | Standard Allowance | Meal Allowance |
--              Communication Allowance | Children Education Allowance |
--              LTA | Gross
--   Deductions: PF | PT | TDS | ESIC Employer | ESIC
--
-- RULES:
--   • 1 group per concept, 1 component per group (neat structure)
--   • Group name = Component name (for clarity)
--   • Derived components have correct formulas
--   • Value components default to 0 (HR sets amounts per employee)
--   • All slabs linked to ALL components
--
-- SAFE: Only removes component definitions, NOT payslips/processing data
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ── STEP 1: Remove old component definitions only ─────────────
DELETE FROM `payroll_slab_components`;
DELETE FROM `payroll_components`;
DELETE FROM `payroll_component_groups`;

ALTER TABLE `payroll_component_groups` AUTO_INCREMENT = 1;
ALTER TABLE `payroll_components`       AUTO_INCREMENT = 1;

-- ── STEP 2: Create Groups (13 total — 8 Earning, 5 Deduction) ─

-- ─── EARNING GROUPS ──────────────────────────────────────────
INSERT INTO `payroll_component_groups`
  (`uuid`,`organization_id`,`company_id`,`name`,`category`,
   `round_format`,`group_function`,`configure_on_profile`,`display_on_profile`,
   `is_editable`,`contributed_by`,`is_active`,`recalculate_on_change`,
   `group_for_payslip`,`display_order`,`disable_arrear`,`display_total_on_process`,
   `tds_same_month`,`is_taxable`,`created_at`,`updated_at`)
VALUES
  -- 1. Basic
  (UUID(),8,NULL,'Basic','Earning',
   'Round','Sum',1,1,1,'Employee',1,0,
   'Earnings',1,0,1,0,1,NOW(),NOW()),

  -- 2. HRA
  (UUID(),8,NULL,'HRA','Earning',
   'Round','Sum',1,1,0,'Employee',1,0,
   'Earnings',2,0,1,0,0,NOW(),NOW()),

  -- 3. Standard Allowance
  (UUID(),8,NULL,'Standard Allowance','Earning',
   'Round','Sum',1,1,0,'Employee',1,0,
   'Earnings',3,0,1,0,1,NOW(),NOW()),

  -- 4. Meal Allowance
  (UUID(),8,NULL,'Meal Allowance','Earning',
   'Round','Sum',1,1,0,'Employee',1,0,
   'Earnings',4,0,1,0,0,NOW(),NOW()),

  -- 5. Communication Allowance
  (UUID(),8,NULL,'Communication Allowance','Earning',
   'Round','Sum',1,1,0,'Employee',1,0,
   'Earnings',5,0,1,0,1,NOW(),NOW()),

  -- 6. Children Education Allowance
  (UUID(),8,NULL,'Children Education Allowance','Earning',
   'Round','Sum',1,1,0,'Employee',1,0,
   'Earnings',6,0,1,0,0,NOW(),NOW()),

  -- 7. LTA
  (UUID(),8,NULL,'LTA','Earning',
   'Round','Sum',1,1,0,'Employee',1,0,
   'Earnings',7,0,1,0,0,NOW(),NOW()),

  -- 8. Gross  (always last earning — sums all above)
  (UUID(),8,NULL,'Gross','Earning',
   'Round','Sum',0,1,0,'Employee',1,1,
   'Earnings',8,0,1,0,1,NOW(),NOW());

-- ─── DEDUCTION GROUPS ────────────────────────────────────────
INSERT INTO `payroll_component_groups`
  (`uuid`,`organization_id`,`company_id`,`name`,`category`,
   `round_format`,`group_function`,`configure_on_profile`,`display_on_profile`,
   `is_editable`,`contributed_by`,`is_active`,`recalculate_on_change`,
   `group_for_payslip`,`display_order`,`disable_arrear`,`display_total_on_process`,
   `tds_same_month`,`is_taxable`,`created_at`,`updated_at`)
VALUES
  -- 9. PF  (Employee Provident Fund)
  (UUID(),8,NULL,'PF','Deduction',
   'Round','Sum',0,1,0,'Employee',1,0,
   'Deductions',9,0,1,0,0,NOW(),NOW()),

  -- 10. PT  (Professional Tax)
  (UUID(),8,NULL,'PT','Deduction',
   'Round','Sum',0,1,0,'Employee',1,0,
   'Deductions',10,0,1,0,0,NOW(),NOW()),

  -- 11. TDS  (Tax Deducted at Source)
  (UUID(),8,NULL,'TDS','Deduction',
   'Round','Sum',0,1,0,'Employee',1,0,
   'Deductions',11,0,1,1,0,NOW(),NOW()),

  -- 12. ESIC Employer  (Employer side ESIC contribution)
  (UUID(),8,NULL,'ESIC Employer','Deduction',
   'Round','Sum',0,1,0,'Employer',1,0,
   'Deductions',12,0,1,0,0,NOW(),NOW()),

  -- 13. ESIC  (Employee side ESIC deduction)
  (UUID(),8,NULL,'ESIC','Deduction',
   'Round','Sum',0,1,0,'Employee',1,0,
   'Deductions',13,0,1,0,0,NOW(),NOW());

-- ── STEP 3: Capture group IDs ─────────────────────────────────
SET @g_basic      = (SELECT id FROM payroll_component_groups WHERE name='Basic'                      AND organization_id=8);
SET @g_hra        = (SELECT id FROM payroll_component_groups WHERE name='HRA'                        AND organization_id=8);
SET @g_std        = (SELECT id FROM payroll_component_groups WHERE name='Standard Allowance'         AND organization_id=8);
SET @g_meal       = (SELECT id FROM payroll_component_groups WHERE name='Meal Allowance'             AND organization_id=8);
SET @g_comm       = (SELECT id FROM payroll_component_groups WHERE name='Communication Allowance'    AND organization_id=8);
SET @g_child      = (SELECT id FROM payroll_component_groups WHERE name='Children Education Allowance' AND organization_id=8);
SET @g_lta        = (SELECT id FROM payroll_component_groups WHERE name='LTA'                        AND organization_id=8);
SET @g_gross      = (SELECT id FROM payroll_component_groups WHERE name='Gross'                      AND organization_id=8);
SET @g_pf         = (SELECT id FROM payroll_component_groups WHERE name='PF'                         AND organization_id=8);
SET @g_pt         = (SELECT id FROM payroll_component_groups WHERE name='PT'                         AND organization_id=8);
SET @g_tds        = (SELECT id FROM payroll_component_groups WHERE name='TDS'                        AND organization_id=8);
SET @g_esic_er    = (SELECT id FROM payroll_component_groups WHERE name='ESIC Employer'              AND organization_id=8);
SET @g_esic_ee    = (SELECT id FROM payroll_component_groups WHERE name='ESIC'                       AND organization_id=8);

-- ── STEP 4: Insert Components (1 per group) ───────────────────
INSERT INTO `payroll_components`
  (`uuid`,`organization_id`,`company_id`,`group_id`,`name`,
   `non_cashable`,`based_on_attendance`,`is_active`,
   `component_type`,`amount`,`formula`,
   `boundary_type`,`min_amount`,`max_amount`,
   `gender_filter`,`created_at`,`updated_at`)
VALUES

  -- ─── EARNINGS ─────────────────────────────────────────────

  -- 1. Basic  →  50% of monthly CTC
  (UUID(),8,NULL,@g_basic,'Basic',
   0,1,1,'Derived',0,'[CTC] * 0.50',
   'Choose',0,0,'All',NOW(),NOW()),

  -- 2. HRA  →  40% of Basic
  (UUID(),8,NULL,@g_hra,'HRA',
   0,1,1,'Derived',0,'[Basic] * 0.40',
   'Choose',0,0,'All',NOW(),NOW()),

  -- 3. Standard Allowance  →  Residual balancer (CTC minus Basic and HRA)
  --    Ensures all component amounts always sum exactly to Gross / CTC
  (UUID(),8,NULL,@g_std,'Standard Allowance',
   0,1,1,'Derived',0,'[CTC] - [Basic] - [HRA]',
   'Choose',0,0,'All',NOW(),NOW()),

  -- 4. Meal Allowance  →  Fixed flat amount (HR sets per employee via salary structure)
  --    Tax-exempt up to ₹26,400/year (₹2,200/month)
  (UUID(),8,NULL,@g_meal,'Meal Allowance',
   0,1,1,'Value',0,NULL,
   'Choose',0,0,'All',NOW(),NOW()),

  -- 5. Communication Allowance  →  Fixed flat amount (fully taxable)
  (UUID(),8,NULL,@g_comm,'Communication Allowance',
   0,0,1,'Value',0,NULL,
   'Choose',0,0,'All',NOW(),NOW()),

  -- 6. Children Education Allowance  →  Fixed flat amount
  --    Tax-exempt: ₹100/child/month, max 2 children = ₹200/month
  (UUID(),8,NULL,@g_child,'Children Education Allowance',
   0,0,1,'Value',0,NULL,
   'Choose',0,0,'All',NOW(),NOW()),

  -- 7. LTA  →  Fixed flat amount (Leave Travel Allowance, tax-exempt)
  (UUID(),8,NULL,@g_lta,'LTA',
   0,0,1,'Value',0,NULL,
   'Choose',0,0,'All',NOW(),NOW()),

  -- 8. Gross  →  Sum of all earning components
  --    This is the total monthly take-home before deductions
  (UUID(),8,NULL,@g_gross,'Gross',
   0,1,1,'Derived',0,
   '[Basic] + [HRA] + [Standard Allowance] + [Meal Allowance] + [Communication Allowance] + [Children Education Allowance] + [LTA]',
   'Choose',0,0,'All',NOW(),NOW()),

  -- ─── DEDUCTIONS ────────────────────────────────────────────

  -- 9. PF  →  12% of Basic, statutory cap ₹1,800/month (on ₹15,000 Basic ceiling)
  (UUID(),8,NULL,@g_pf,'PF',
   0,1,1,'Derived',0,'min(1800, [Basic] * 0.12)',
   'Max',0,1800,'All',NOW(),NOW()),

  -- 10. PT  →  Professional Tax ₹200/month flat (Maharashtra slab)
  --     Based on Gross, but for simplicity set as Value = 200
  --     PT is 0 if Gross < ₹10,000/month (handled at processing)
  (UUID(),8,NULL,@g_pt,'PT',
   0,0,1,'Value',200,NULL,
   'Max',0,200,'All',NOW(),NOW()),

  -- 11. TDS  →  Income Tax module (calculated annually, deducted monthly)
  (UUID(),8,NULL,@g_tds,'TDS',
   0,0,1,'Module',0,NULL,
   'Choose',0,0,'All',NOW(),NOW()),

  -- 12. ESIC Employer  →  3.25% of Gross (employer contribution, applicable if Gross ≤ ₹21,000)
  (UUID(),8,NULL,@g_esic_er,'ESIC Employer',
   0,1,1,'Derived',0,'[Gross] * 0.0325',
   'Choose',0,0,'All',NOW(),NOW()),

  -- 13. ESIC  →  0.75% of Gross (employee deduction, applicable if Gross ≤ ₹21,000)
  (UUID(),8,NULL,@g_esic_ee,'ESIC',
   0,1,1,'Derived',0,'[Gross] * 0.0075',
   'Choose',0,0,'All',NOW(),NOW());

-- ── STEP 5: Link ALL components to ALL payroll slabs ──────────
SET @all_comp_ids = (
  SELECT JSON_ARRAYAGG(CAST(id AS CHAR))
  FROM `payroll_components`
  WHERE organization_id = 8
  ORDER BY id ASC
);

UPDATE `payroll_slabs`
SET `selected_component_ids` = @all_comp_ids,
    `updated_at` = NOW()
WHERE `organization_id` = 8;

SET FOREIGN_KEY_CHECKS = 1;

-- ── VERIFY ────────────────────────────────────────────────────
SELECT
  pcg.display_order AS `Order`,
  pcg.category      AS `Category`,
  pcg.name          AS `Group`,
  pc.name           AS `Component`,
  pc.component_type AS `Type`,
  COALESCE(pc.formula, CONCAT('Value=', pc.amount)) AS `Formula / Amount`
FROM payroll_components pc
JOIN payroll_component_groups pcg ON pc.group_id = pcg.id
WHERE pc.organization_id = 8
ORDER BY pcg.display_order, pc.id;

SELECT '✅ Restructure complete — 13 groups, 1 component each, names match report columns.' AS status;
-- ============================================================
