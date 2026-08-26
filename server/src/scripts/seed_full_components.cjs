/**
 * seed_full_components.cjs
 * Seeds a complete, organized set of payroll components for Org 8.
 * Groups are updated with proper display_order, and components are added
 * across all standard Indian payroll categories.
 */

const { v4: uuidv4 } = require('uuid');
const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

const ORG_ID = 8;
const now = new Date();

async function run() {
  // ─── STEP 1: Update Groups with display_order & fix metadata ─────────────
  console.log('\n=== STEP 1: Updating Group metadata ===');
  const groupUpdates = [
    { id: 1, name: 'Basic Pay & House Rent',         category: 'Earning',    display_order: 1, is_taxable: 1 },
    { id: 2, name: 'Fixed Allowances & Perks',       category: 'Earning',    display_order: 2, is_taxable: 1 },
    { id: 3, name: 'Performance & Variable Pay',     category: 'Earning',    display_order: 3, is_taxable: 1 },
    { id: 4, name: 'Statutory Deductions',           category: 'Deduction',  display_order: 4, is_taxable: 0 },
    { id: 5, name: 'Loans, Advances & Recoveries',  category: 'Deduction',  display_order: 5, is_taxable: 0 },
  ];
  for (const g of groupUpdates) {
    await db('payroll_component_groups').where({ id: g.id, organization_id: ORG_ID }).update({
      name: g.name,
      category: g.category,
      display_order: g.display_order,
      is_taxable: g.is_taxable,
      is_active: 1,
      recalculate_on_change: 1,
      configure_on_profile: 1,
      display_on_profile: 1,
      is_editable: 1,
      updated_at: now,
    });
    console.log(`  ✓ Group ${g.id}: "${g.name}" [${g.category}] order:${g.display_order}`);
  }

  // ─── STEP 2: Update existing 21 components with correct values ────────────
  console.log('\n=== STEP 2: Fixing existing components ===');
  const existingUpdates = [
    // --- Group 1: Basic Pay & House Rent (Earning) ---
    { id: 1,  group_id: 1,  name: 'Basic Salary',                    component_type: 'Derived', amount: 0,    formula: '[CTC] * 0.50',                        non_cashable: 0, based_on_attendance: 1 },
    { id: 2,  group_id: 1,  name: 'House Rent Allowance (HRA)',       component_type: 'Derived', amount: 0,    formula: '[Basic Salary] * 0.40',                non_cashable: 0, based_on_attendance: 1 },
    // --- Group 2: Fixed Allowances (Earning) ---
    { id: 3,  group_id: 2,  name: 'Special Allowance',               component_type: 'Derived', amount: 0,    formula: '[CTC] - ([Basic Salary] + [House Rent Allowance (HRA)] + [Conveyance Allowance] + [Medical Allowance] + [Children Education Allowance])', non_cashable: 0, based_on_attendance: 1 },
    { id: 4,  group_id: 2,  name: 'Conveyance Allowance',            component_type: 'Value',   amount: 1600, formula: null,                                   non_cashable: 0, based_on_attendance: 0 },
    { id: 5,  group_id: 2,  name: 'Medical Allowance',               component_type: 'Value',   amount: 1250, formula: null,                                   non_cashable: 0, based_on_attendance: 0 },
    { id: 6,  group_id: 2,  name: 'Children Education Allowance',    component_type: 'Value',   amount: 200,  formula: null,                                   non_cashable: 0, based_on_attendance: 0 },
    { id: 7,  group_id: 2,  name: 'Telephone & Internet Allowance',  component_type: 'Value',   amount: 0,    formula: null,                                   non_cashable: 0, based_on_attendance: 0 },
    { id: 8,  group_id: 2,  name: 'Meal Allowance',                  component_type: 'Value',   amount: 0,    formula: null,                                   non_cashable: 0, based_on_attendance: 0 },
    { id: 9,  group_id: 2,  name: 'Leave Travel Allowance (LTA)',    component_type: 'Derived', amount: 0,    formula: '[Basic Salary] * (8.33 / 100)',         non_cashable: 0, based_on_attendance: 0 },
    { id: 10, group_id: 2,  name: 'Uniform Allowance',               component_type: 'Value',   amount: 0,    formula: null,                                   non_cashable: 1, based_on_attendance: 0 },
    // --- Group 3: Performance & Variable Pay (Earning) ---
    { id: 11, group_id: 3,  name: 'Performance Bonus',               component_type: 'Derived', amount: 0,    formula: '[Basic Salary] * 0.10',                non_cashable: 0, based_on_attendance: 0 },
    { id: 12, group_id: 3,  name: 'Overtime Pay',                    component_type: 'Module',  amount: 0,    formula: null,                                   non_cashable: 0, based_on_attendance: 0, module_source: 'overtime' },
    { id: 13, group_id: 3,  name: 'Shift Allowance',                 component_type: 'Value',   amount: 0,    formula: null,                                   non_cashable: 0, based_on_attendance: 0 },
    // --- Group 4: Statutory Deductions ---
    { id: 14, group_id: 4,  name: 'Provident Fund (EPF)',            component_type: 'Derived', amount: 0,    formula: 'min(1800, [Basic Salary] * 0.12)',     non_cashable: 0, based_on_attendance: 0 },
    { id: 15, group_id: 4,  name: 'Employee State Insurance (ESIC)', component_type: 'Derived', amount: 0,    formula: '[Gross] * (0.75 / 100)',               non_cashable: 0, based_on_attendance: 0 },
    { id: 16, group_id: 4,  name: 'Professional Tax (PT)',           component_type: 'Value',   amount: 200,  formula: null,                                   non_cashable: 0, based_on_attendance: 0 },
    { id: 17, group_id: 4,  name: 'Tax Deducted at Source (TDS)',   component_type: 'Module',  amount: 0,    formula: null,                                   non_cashable: 0, based_on_attendance: 0, module_source: 'tds' },
    { id: 18, group_id: 4,  name: 'Labour Welfare Fund (LWF)',       component_type: 'Value',   amount: 25,   formula: null,                                   non_cashable: 0, based_on_attendance: 0 },
    // --- Group 5: Loans, Advances & Recoveries ---
    { id: 19, group_id: 5,  name: 'Salary Advance Recovery',         component_type: 'Module',  amount: 0,    formula: null,                                   non_cashable: 0, based_on_attendance: 0, module_source: 'salary_advance' },
    { id: 20, group_id: 5,  name: 'Loan EMI Deduction',              component_type: 'Module',  amount: 0,    formula: null,                                   non_cashable: 0, based_on_attendance: 0, module_source: 'loan' },
    { id: 21, group_id: 5,  name: 'Loss of Pay (LOP)',               component_type: 'Module',  amount: 0,    formula: null,                                   non_cashable: 0, based_on_attendance: 0, module_source: 'lop' },
  ];

  for (const c of existingUpdates) {
    const payload = {
      group_id: c.group_id,
      name: c.name,
      component_type: c.component_type,
      amount: c.amount,
      formula: c.formula,
      non_cashable: c.non_cashable,
      based_on_attendance: c.based_on_attendance,
      is_active: 1,
      module_source: c.module_source || null,
      updated_at: now,
    };
    await db('payroll_components').where({ id: c.id }).update(payload);
    console.log(`  ✓ ID:${c.id} "${c.name}" [${c.component_type}] ${c.formula ? 'F:' + c.formula.substring(0, 50) + '...' : 'Amt:' + c.amount}`);
  }

  // ─── STEP 3: Add NEW components (check duplicates first) ─────────────────
  console.log('\n=== STEP 3: Adding new components ===');
  const newComponents = [
    // --- Group 1: Basic Pay & House Rent ---
    {
      group_id: 1, name: 'Dearness Allowance (DA)',
      component_type: 'Derived', amount: 0,
      formula: '[Basic Salary] * 0.17',
      based_on_attendance: 1, non_cashable: 0,
      note: '17% of Basic — govt dearness allowance'
    },

    // --- Group 2: Fixed Allowances & Perks ---
    {
      group_id: 2, name: 'Fuel & Car Maintenance Allowance',
      component_type: 'Value', amount: 0,
      formula: null,
      based_on_attendance: 0, non_cashable: 0,
      note: 'Fixed monthly car/fuel reimbursement'
    },
    {
      group_id: 2, name: 'Book & Periodical Allowance',
      component_type: 'Value', amount: 0,
      formula: null,
      based_on_attendance: 0, non_cashable: 0,
      note: 'Tax-exempt up to ₹2400/yr'
    },
    {
      group_id: 2, name: 'Helper Allowance',
      component_type: 'Value', amount: 0,
      formula: null,
      based_on_attendance: 0, non_cashable: 0,
      note: 'Allowance for maintaining personal helper'
    },

    // --- Group 3: Performance & Variable Pay ---
    {
      group_id: 3, name: 'Statutory Bonus',
      component_type: 'Derived', amount: 0,
      formula: 'min(7000, [Basic Salary]) * 0.0833',
      based_on_attendance: 0, non_cashable: 0,
      note: '8.33% of Basic (capped at ₹7000) — Payment of Bonus Act'
    },
    {
      group_id: 3, name: 'Festival / Ex-Gratia Bonus',
      component_type: 'Value', amount: 0,
      formula: null,
      based_on_attendance: 0, non_cashable: 0,
      note: 'Discretionary bonus during festivals'
    },
    {
      group_id: 3, name: 'Arrears',
      component_type: 'Value', amount: 0,
      formula: null,
      based_on_attendance: 0, non_cashable: 0,
      note: 'Salary arrears from revision or backdated increment'
    },
    {
      group_id: 3, name: 'Gratuity Provision',
      component_type: 'Derived', amount: 0,
      formula: '[Basic Salary] * (4.81 / 100)',
      based_on_attendance: 0, non_cashable: 1,
      note: '4.81% of Basic (non-cashable employer provision)'
    },

    // --- Group 4: Statutory Deductions ---
    {
      group_id: 4, name: 'Employer PF Contribution',
      component_type: 'Derived', amount: 0,
      formula: 'min(1800, [Basic Salary] * 0.12)',
      based_on_attendance: 0, non_cashable: 1,
      note: 'Employer share of PF (non-cashable CTC cost)'
    },
    {
      group_id: 4, name: 'Employer ESIC Contribution',
      component_type: 'Derived', amount: 0,
      formula: '[Gross] * (3.25 / 100)',
      based_on_attendance: 0, non_cashable: 1,
      note: 'Employer share of ESIC (non-cashable CTC cost)'
    },
  ];

  let addedCount = 0;
  for (const c of newComponents) {
    const existing = await db('payroll_components')
      .where({ organization_id: ORG_ID, name: c.name })
      .whereNull('deleted_at')
      .first();

    if (existing) {
      console.log(`  ⚠ SKIP (exists) "${c.name}"`);
      continue;
    }

    const payload = {
      uuid: uuidv4(),
      organization_id: ORG_ID,
      group_id: c.group_id,
      name: c.name,
      component_type: c.component_type,
      amount: c.amount,
      formula: c.formula,
      based_on_attendance: c.based_on_attendance,
      non_cashable: c.non_cashable,
      is_active: 1,
      module_source: null,
      boundary_type: 'None',
      created_at: now,
      updated_at: now,
    };

    const [newId] = await db('payroll_components').insert(payload);
    addedCount++;
    console.log(`  + ID:${newId} "${c.name}" [${c.component_type}] → ${c.note}`);
  }

  // ─── STEP 4: Verify final state ───────────────────────────────────────────
  console.log('\n=== STEP 4: FINAL COMPONENT LIST ===');
  const groups = await db('payroll_component_groups').where('organization_id', ORG_ID).orderBy('display_order');
  const allComps = await db('payroll_components')
    .where('organization_id', ORG_ID)
    .whereNull('deleted_at')
    .orderBy('group_id')
    .orderBy('id');

  for (const g of groups) {
    console.log(`\n  📁 [${g.category}] ${g.name} (Group ${g.id}, order ${g.display_order})`);
    const comps = allComps.filter(c => c.group_id === g.id);
    if (comps.length === 0) {
      console.log('     (no components)');
    }
    for (const c of comps) {
      const typeLabel = c.component_type === 'Derived' ? '⚙' : c.component_type === 'Module' ? '🔌' : '💰';
      const detail = c.formula ? `Formula: ${c.formula.substring(0, 60)}` : `Amount: ₹${c.amount}`;
      const flags = [c.non_cashable ? '🔴NonCash' : '', c.based_on_attendance ? '📅ProRated' : ''].filter(Boolean).join(' ');
      console.log(`     ${typeLabel} ID:${c.id} "${c.name}" | ${detail} ${flags}`);
    }
  }

  console.log(`\n=== DONE — ${addedCount} new components added ===`);
  await db.destroy();
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
