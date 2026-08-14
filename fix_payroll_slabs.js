/**
 * PAYROLL SLAB FIX SCRIPT
 * ========================
 * HOW SLABS ARE ACTUALLY USED IN PAYROLL:
 *
 * 1. MATCHING: When running payroll for an employee, the system looks up their
 *    salary_structure → salary_structure.slab_id → payroll_slabs
 *
 * 2. COMPONENT FILTERING: selected_component_ids tells the payroll engine
 *    WHICH components to calculate for employees in this slab.
 *    e.g. Entry-level employees get Basic+HRA+PF+PT only.
 *    Senior employees get all components including TDS, LTA, Bonus.
 *
 * 3. PT TIERS: pt_tiers defines Professional Tax brackets for this slab.
 *    Different states have different PT slabs.
 *
 * 4. EMPLOYEE GROUPING: Slabs also group employees by dept/grade/location/CTC.
 *    When running payroll, you can filter by slab to process a group together.
 *
 * 5. CYCLE LINK: cycle_id links the slab to a pay cycle (monthly, weekly etc.)
 *    so employees on different cycles can have different slabs.
 *
 * ISSUES BEING FIXED:
 * - 4 slabs soft-deleted → hard delete them (they're useless test data)
 * - 1 test slab with wrong name → delete it
 * - cycle_id pointing to deleted cycles → update to new monthly cycle IDs
 * - Org 70 has zero slabs → seed 4 standard slabs for org 70
 * - selected_component_ids = null → fill with correct component IDs
 * - pt_tiers = null → fill with Maharashtra PT tiers (standard)
 */

const knex = require('knex');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '.env' });

const db = knex({
  client: 'mysql2',
  connection: {
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME     || process.env.DB_DATABASE,
    port:     Number(process.env.DB_PORT) || 3306
  }
});

// ── Standard Maharashtra Professional Tax Tiers ───────────────────────────
const PT_TIERS = [
  { min: 0,      max: 7500,   tax: 0   },
  { min: 7501,   max: 10000,  tax: 175 },
  { min: 10001,  max: 999999, tax: 200 }
];

// ── Component IDs from payroll_components table ───────────────────────────
// Earnings
const BASIC        = 101;
const HRA          = 102;
const SPECIAL_ALL  = 103;
const CONVEYANCE   = 104;
const MEDICAL      = 105;
const PERF_BONUS   = 110;
// Deductions
const EPF          = 106;  // Employee PF (12%)
const PT           = 107;  // Professional Tax
const ESIC         = 108;  // ESIC (0.75%)
const TDS          = 109;  // Income Tax TDS

// ── 4 Standard Salary Slabs ───────────────────────────────────────────────
//
//  SLAB 1 — Entry Level    ₹2L  – ₹5L   (Fresher, Junior)
//  SLAB 2 — Mid Level      ₹5L  – ₹12L  (Senior, TL)
//  SLAB 3 — Senior Level   ₹12L – ₹25L  (Manager, Lead)
//  SLAB 4 — Executive      ₹25L+         (Director, VP)
//
const SLAB_TEMPLATES = [
  {
    name:                   'Entry Level (₹2L – ₹5L)',
    min_ctc:                200000,
    max_ctc:                500000,
    employment_type:        'Regular',
    // Entry level: Basic, HRA, Conveyance, PF, PT only (no ESIC if gross > 21k)
    selected_component_ids: [BASIC, HRA, CONVEYANCE, EPF, PT],
    pt_tiers:               PT_TIERS,
    pf_rate_pct:            12.00,
    departments:            [],
    grades:                 [],
    locations:              [],
    is_active:              true,
  },
  {
    name:                   'Mid Level (₹5L – ₹12L)',
    min_ctc:                500000,
    max_ctc:                1200000,
    employment_type:        'Regular',
    // Mid level: All earnings + statutory deductions
    selected_component_ids: [BASIC, HRA, SPECIAL_ALL, CONVEYANCE, MEDICAL, EPF, PT, ESIC],
    pt_tiers:               PT_TIERS,
    pf_rate_pct:            12.00,
    departments:            [],
    grades:                 [],
    locations:              [],
    is_active:              true,
  },
  {
    name:                   'Senior Level (₹12L – ₹25L)',
    min_ctc:                1200000,
    max_ctc:                2500000,
    employment_type:        'Regular',
    // Senior: All components + TDS (income tax kicks in)
    selected_component_ids: [BASIC, HRA, SPECIAL_ALL, CONVEYANCE, MEDICAL, EPF, PT, TDS],
    pt_tiers:               PT_TIERS,
    pf_rate_pct:            12.00,
    departments:            [],
    grades:                 [],
    locations:              [],
    is_active:              true,
  },
  {
    name:                   'Executive (₹25L+)',
    min_ctc:                2500000,
    max_ctc:                99999999,
    employment_type:        'Regular',
    // Executive: All components including Performance Bonus + TDS
    selected_component_ids: [BASIC, HRA, SPECIAL_ALL, CONVEYANCE, MEDICAL, PERF_BONUS, EPF, PT, TDS],
    pt_tiers:               PT_TIERS,
    pf_rate_pct:            12.00,
    departments:            [],
    grades:                 [],
    locations:              [],
    is_active:              true,
  }
];

async function run() {
  try {
    await db.raw('SET FOREIGN_KEY_CHECKS = 0');

    // ── Step 1: Get monthly cycle ID for each org ──────────────────────────
    const monthlyCycles = await db('payroll_cycles')
      .whereIn('organization_id', [68, 70])
      .where('cycle_type', 'monthly')
      .whereNull('deleted_at')
      .select('id', 'organization_id');

    const cycleMap = {};
    monthlyCycles.forEach(c => { cycleMap[c.organization_id] = c.id; });
    console.log('Monthly cycle IDs:', cycleMap);

    // ── Step 2: Hard delete ALL existing slabs (clean slate) ────────────────
    const deleted = await db('payroll_slabs')
      .whereIn('organization_id', [68, 70])
      .delete();
    console.log('Deleted ' + deleted + ' existing slabs');

    // ── Step 3: Seed 4 standard slabs for each org ──────────────────────────
    let inserted = 0;
    for (const orgId of [68, 70]) {
      const cycleId = cycleMap[orgId] || null;
      for (const tpl of SLAB_TEMPLATES) {
        await db('payroll_slabs').insert({
          uuid:                   uuidv4(),
          organization_id:        orgId,
          name:                   tpl.name,
          departments:            JSON.stringify(tpl.departments),
          grades:                 JSON.stringify(tpl.grades),
          locations:              JSON.stringify(tpl.locations),
          min_ctc:                tpl.min_ctc,
          max_ctc:                tpl.max_ctc,
          selected_component_ids: JSON.stringify(tpl.selected_component_ids),
          cycle_id:               cycleId,
          employment_type:        tpl.employment_type,
          pf_rate_pct:            tpl.pf_rate_pct,
          pt_tiers:               JSON.stringify(tpl.pt_tiers),
          rules_config:           null,
          is_active:              tpl.is_active ? 1 : 0,
          deleted_at:             null,
        });
        inserted++;
      }
    }

    await db.raw('SET FOREIGN_KEY_CHECKS = 1');

    // ── Step 4: Verify ──────────────────────────────────────────────────────
    const result = await db('payroll_slabs')
      .whereIn('organization_id', [68, 70])
      .select('id', 'organization_id', 'name', 'min_ctc', 'max_ctc', 'cycle_id', 'is_active')
      .orderBy('organization_id').orderBy('min_ctc');

    console.log('\nCreated ' + inserted + ' slabs:\n');
    result.forEach(s => {
      const minL = (Number(s.min_ctc) / 100000).toFixed(0) + 'L';
      const maxL = Number(s.max_ctc) >= 9999999 ? '∞' : (Number(s.max_ctc) / 100000).toFixed(0) + 'L';
      console.log(
        'Org ' + s.organization_id +
        ' | Cycle ' + (s.cycle_id || 'null') +
        ' | ' + s.name.padEnd(35) +
        ' | CTC: ₹' + minL + ' – ₹' + maxL +
        ' | Active: ' + (s.is_active ? 'Yes' : 'No')
      );
    });

    // ── Step 5: Explain how slabs are used in payroll ───────────────────────
    console.log('\n── HOW SLABS WORK IN PAYROLL ──────────────────────────────────');
    console.log('1. Each employee has a salary_structure → slab_id');
    console.log('2. When payroll runs, it reads slab.selected_component_ids');
    console.log('3. Only those components are calculated for that employee');
    console.log('4. PT is calculated using slab.pt_tiers (state-specific brackets)');
    console.log('5. Slab.cycle_id links it to a pay cycle (monthly/weekly etc.)');
    console.log('6. Slabs group employees by CTC range for batch processing');
    console.log('\nExample flow:');
    console.log('  Employee CTC = ₹8L → matched to "Mid Level" slab');
    console.log('  Mid Level slab components: Basic + HRA + Special + Conveyance + Medical + EPF + PT + ESIC');
    console.log('  Payroll engine calculates ONLY these 8 components for this employee');
    console.log('  PT is ₹200 (Gross > ₹10,001 per Maharashtra PT tier)');
    console.log('\nDone!');

  } catch (e) {
    console.error('ERROR:', e.message);
    await db.raw('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
  } finally {
    await db.destroy();
  }
}

run();
