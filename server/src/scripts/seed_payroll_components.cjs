/**
 * seed_payroll_components.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds standard Indian payroll component groups + components.
 * ONE GROUP PER COMPONENT TYPE (granular, like the UI shows).
 *
 * Run:
 *   node src/scripts/seed_payroll_components.cjs <org_id>
 *
 * Example:
 *   node src/scripts/seed_payroll_components.cjs 8
 */

const knex = require('knex');
const { v4: uuidv4 } = require('uuid');

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
  },
});

const orgId = Number(process.argv[2] || 8);

// ─────────────────────────────────────────────────────────────────────────────
// GROUPS  —  one group per component type, just like UI cards
// ─────────────────────────────────────────────────────────────────────────────
//   display_order: 1–15 = Earning, 20–40 = Deduction
//   is_taxable: true = income tax applies on this group
//   disable_arrear: true = no backdated arrear processing for this group
// ─────────────────────────────────────────────────────────────────────────────
const GROUPS = [

  // ═══════════════════════════════════ EARNING GROUPS ═══════════════════════
  {
    code: 'GRP_BASIC',       name: 'Basic Pay',
    category: 'Earning',     display_order: 1,
    is_taxable: true,        disable_arrear: false,
    description: 'Core basic salary component',
  },
  {
    code: 'GRP_HRA',         name: 'House Rent Allowance',
    category: 'Earning',     display_order: 2,
    is_taxable: false,       disable_arrear: false,
    description: 'HRA - partially exempt u/s 10(13A)',
  },
  {
    code: 'GRP_CONVEYANCE',  name: 'Conveyance Allowance',
    category: 'Earning',     display_order: 3,
    is_taxable: false,       disable_arrear: false,
    description: 'Transport / commute allowance',
  },
  {
    code: 'GRP_MEDICAL',     name: 'Medical Allowance',
    category: 'Earning',     display_order: 4,
    is_taxable: false,       disable_arrear: false,
    description: 'Medical reimbursement allowance',
  },
  {
    code: 'GRP_LTA',         name: 'Leave Travel Allowance',
    category: 'Earning',     display_order: 5,
    is_taxable: false,       disable_arrear: true,
    description: 'LTA - exempt u/s 10(5), 2 journeys per 4-yr block',
  },
  {
    code: 'GRP_CEA',         name: 'Children Education Allowance',
    category: 'Earning',     display_order: 6,
    is_taxable: false,       disable_arrear: true,
    description: 'CEA - Rs.100/child/month, max 2 children, exempt u/s 10(14)',
  },
  {
    code: 'GRP_MEAL',        name: 'Meal Allowance',
    category: 'Earning',     display_order: 7,
    is_taxable: false,       disable_arrear: true,
    description: 'Food coupons / meal cards - exempt up to Rs.50/meal',
  },
  {
    code: 'GRP_TELEPHONE',   name: 'Telephone Allowance',
    category: 'Earning',     display_order: 8,
    is_taxable: false,       disable_arrear: true,
    description: 'Telephone / internet reimbursement',
  },
  {
    code: 'GRP_UNIFORM',     name: 'Uniform Allowance',
    category: 'Earning',     display_order: 9,
    is_taxable: false,       disable_arrear: true,
    description: 'Uniform / dress code allowance',
  },
  {
    code: 'GRP_SPECIAL',     name: 'Special Allowance',
    category: 'Earning',     display_order: 10,
    is_taxable: true,        disable_arrear: false,
    description: 'Residual / balance allowance to make up gross CTC',
  },
  {
    code: 'GRP_PERF_BONUS',  name: 'Performance Bonus',
    category: 'Earning',     display_order: 11,
    is_taxable: true,        disable_arrear: true,
    description: 'Discretionary variable performance bonus',
  },
  {
    code: 'GRP_STAT_BONUS',  name: 'Statutory Bonus',
    category: 'Earning',     display_order: 12,
    is_taxable: true,        disable_arrear: true,
    description: 'Statutory bonus under Payment of Bonus Act (min 8.33%)',
  },
  {
    code: 'GRP_OVERTIME',    name: 'Overtime',
    category: 'Earning',     display_order: 13,
    is_taxable: true,        disable_arrear: true,
    description: 'Overtime earnings from attendance module',
  },
  {
    code: 'GRP_ARREARS',     name: 'Arrears',
    category: 'Earning',     display_order: 14,
    is_taxable: true,        disable_arrear: false,
    description: 'Backdated salary revision arrear payments',
  },
  {
    code: 'GRP_GRATUITY',    name: 'Gratuity',
    category: 'Earning',     display_order: 15,
    is_taxable: false,       disable_arrear: true,
    description: 'Employer gratuity provision (non-cashable in payslip)',
  },

  // ═══════════════════════════════════ DEDUCTION GROUPS ═════════════════════
  {
    code: 'GRP_PF',          name: 'Provident Fund',
    category: 'Deduction',   display_order: 20,
    is_taxable: false,       disable_arrear: false,
    description: 'Employee PF contribution - 12% of basic, ceiling Rs.15000',
  },
  {
    code: 'GRP_ESIC',        name: 'Employee State Insurance',
    category: 'Deduction',   display_order: 21,
    is_taxable: false,       disable_arrear: false,
    description: 'ESIC - 0.75% of gross, only if gross <= Rs.21000',
  },
  {
    code: 'GRP_PT',          name: 'Professional Tax',
    category: 'Deduction',   display_order: 22,
    is_taxable: false,       disable_arrear: false,
    description: 'State professional tax (varies by state)',
  },
  {
    code: 'GRP_TDS',         name: 'TDS',
    category: 'Deduction',   display_order: 23,
    is_taxable: false,       disable_arrear: false,
    description: 'Tax Deducted at Source from projected annual income',
  },
  {
    code: 'GRP_LOP',         name: 'LOP',
    category: 'Deduction',   display_order: 24,
    is_taxable: false,       disable_arrear: false,
    description: 'Loss of Pay for unpaid absent days',
  },
  {
    code: 'GRP_LATE',        name: 'Late Deduction',
    category: 'Deduction',   display_order: 25,
    is_taxable: false,       disable_arrear: false,
    description: 'Deduction for late punch-ins beyond grace period',
  },
  {
    code: 'GRP_LOAN',        name: 'Loan',
    category: 'Deduction',   display_order: 26,
    is_taxable: false,       disable_arrear: true,
    description: 'Monthly EMI recovery for active employee loans',
  },
  {
    code: 'GRP_ADVANCE',     name: 'Salary Advance Recovery',
    category: 'Deduction',   display_order: 27,
    is_taxable: false,       disable_arrear: true,
    description: 'Recovery of salary advance paid to employee',
  },
  {
    code: 'GRP_MISC_DED',    name: 'Miscellaneous Deduction',
    category: 'Deduction',   display_order: 28,
    is_taxable: false,       disable_arrear: true,
    description: 'Other manual deductions — fines, damage recovery, etc.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS  —  one component per group (can add more per group manually)
// ─────────────────────────────────────────────────────────────────────────────
const COMPONENTS = [

  // ── EARNING COMPONENTS ───────────────────────────────────────────────────
  {
    group_code: 'GRP_BASIC', code: 'BASIC', name: 'Basic Salary',
    component_type: 'Derived', formula: '50% of gross',
    amount: 0, is_taxable: true, based_on_attendance: true,
    display_on_payslip: true, configure_on_profile: true,
    description: 'Formula: 50% of gross monthly CTC. Pro-rated on LOP.',
  },
  {
    group_code: 'GRP_HRA', code: 'HRA', name: 'House Rent Allowance',
    component_type: 'Derived', formula: '40% of basic',
    amount: 0, is_taxable: false, based_on_attendance: true,
    display_on_payslip: true, configure_on_profile: true,
    description: 'Formula: 40% of Basic. Exempt u/s 10(13A). Pro-rated on LOP.',
  },
  {
    group_code: 'GRP_CONVEYANCE', code: 'CONVEYANCE', name: 'Conveyance Allowance',
    component_type: 'Value', formula: '',
    amount: 1600, is_taxable: false, based_on_attendance: true,
    display_on_payslip: true, configure_on_profile: true,
    description: 'Fixed Rs.1600/month. Tax-exempt. Pro-rated on LOP.',
  },
  {
    group_code: 'GRP_MEDICAL', code: 'MEDICAL', name: 'Medical Allowance',
    component_type: 'Value', formula: '',
    amount: 1250, is_taxable: false, based_on_attendance: true,
    display_on_payslip: true, configure_on_profile: true,
    description: 'Fixed Rs.1250/month. Pro-rated on LOP.',
  },
  {
    group_code: 'GRP_LTA', code: 'LTA', name: 'Leave Travel Allowance',
    component_type: 'Value', formula: '',
    amount: 0, is_taxable: false, based_on_attendance: false,
    display_on_payslip: true, configure_on_profile: true,
    description: 'Set per employee. Not pro-rated — paid even during leave.',
  },
  {
    group_code: 'GRP_CEA', code: 'CEA', name: 'Children Education Allowance',
    component_type: 'Value', formula: '',
    amount: 0, is_taxable: false, based_on_attendance: false,
    display_on_payslip: true, configure_on_profile: true,
    description: 'Rs.100/child/month, max 2 children. Set per employee.',
  },
  {
    group_code: 'GRP_MEAL', code: 'MEAL', name: 'Meal Allowance',
    component_type: 'Value', formula: '',
    amount: 0, is_taxable: false, based_on_attendance: false,
    display_on_payslip: true, configure_on_profile: true,
    description: 'Food/meal coupon. Not pro-rated.',
  },
  {
    group_code: 'GRP_TELEPHONE', code: 'TELEPHONE', name: 'Telephone Allowance',
    component_type: 'Value', formula: '',
    amount: 0, is_taxable: false, based_on_attendance: false,
    display_on_payslip: true, configure_on_profile: true,
    description: 'Telephone/internet reimbursement. Not pro-rated.',
  },
  {
    group_code: 'GRP_UNIFORM', code: 'UNIFORM', name: 'Uniform Allowance',
    component_type: 'Value', formula: '',
    amount: 0, is_taxable: false, based_on_attendance: false,
    display_on_payslip: true, configure_on_profile: true,
    description: 'Dress/uniform allowance. Not pro-rated.',
  },
  {
    group_code: 'GRP_SPECIAL', code: 'SPECIAL_ALLOWANCE', name: 'Special Allowance',
    component_type: 'Derived', formula: '',
    amount: 0, is_taxable: true, based_on_attendance: true,
    display_on_payslip: true, configure_on_profile: false,
    description: 'Residual: gross - basic - hra - all other earnings. Auto-computed.',
  },
  {
    group_code: 'GRP_PERF_BONUS', code: 'PERF_BONUS', name: 'Performance Bonus',
    component_type: 'Value', formula: '',
    amount: 0, is_taxable: true, based_on_attendance: false,
    display_on_payslip: true, configure_on_profile: false,
    description: 'Discretionary. Set per employee per month. Fully taxable.',
  },
  {
    group_code: 'GRP_STAT_BONUS', code: 'STATUTORY_BONUS', name: 'Statutory Bonus',
    component_type: 'Derived', formula: '8.33% of basic',
    amount: 0, is_taxable: true, based_on_attendance: false,
    display_on_payslip: true, configure_on_profile: false,
    description: 'Min 8.33% of basic under Payment of Bonus Act.',
  },
  {
    group_code: 'GRP_OVERTIME', code: 'OVERTIME', name: 'Overtime Pay',
    component_type: 'Module', formula: '',
    amount: 0, module_source: 'overtime', is_taxable: true, based_on_attendance: false,
    display_on_payslip: true, configure_on_profile: false,
    description: 'From attendance module. 2x hourly rate per OT hour.',
  },
  {
    group_code: 'GRP_GRATUITY', code: 'GRATUITY', name: 'Gratuity Provision',
    component_type: 'Derived', formula: '4.81% of basic',
    amount: 0, is_taxable: false, based_on_attendance: false,
    display_on_payslip: true, configure_on_profile: false,
    is_non_cashable: true,
    description: 'Employer gratuity: 4.81% of basic. Non-cashable (shown in CTC only).',
  },

  // ── DEDUCTION COMPONENTS ─────────────────────────────────────────────────
  {
    group_code: 'GRP_PF', code: 'EPF', name: 'Employee Provident Fund',
    component_type: 'Derived', formula: '12% of min(basic, 15000)',
    amount: 0, is_taxable: false, based_on_attendance: false,
    display_on_payslip: true, configure_on_profile: false,
    description: '12% of basic, capped at Rs.15000 EPFO wage ceiling.',
  },
  {
    group_code: 'GRP_ESIC', code: 'ESIC', name: 'Employee State Insurance',
    component_type: 'Derived', formula: '0.75% of gross',
    amount: 0, is_taxable: false, based_on_attendance: false,
    display_on_payslip: true, configure_on_profile: false,
    description: '0.75% of gross. Only applicable if gross <= Rs.21000.',
  },
  {
    group_code: 'GRP_PT', code: 'PT', name: 'Professional Tax',
    component_type: 'Value', formula: '',
    amount: 200, is_taxable: false, based_on_attendance: false,
    display_on_payslip: true, configure_on_profile: false,
    description: 'State professional tax. Amount varies by state. Default Rs.200.',
  },
  {
    group_code: 'GRP_TDS', code: 'TDS', name: 'Tax Deducted at Source',
    component_type: 'Module', formula: '',
    amount: 0, module_source: 'tds', is_taxable: false, based_on_attendance: false,
    display_on_payslip: true, configure_on_profile: false,
    description: 'Auto-computed from projected annual income. New tax regime.',
  },
  {
    group_code: 'GRP_LOP', code: 'LOP', name: 'Loss of Pay',
    component_type: 'Module', formula: '',
    amount: 0, module_source: 'lop', is_taxable: false, based_on_attendance: true,
    display_on_payslip: true, configure_on_profile: false,
    description: 'Auto: (gross / total_days) x lop_days. From leave records.',
  },
  {
    group_code: 'GRP_LATE', code: 'LATE_DED', name: 'Late Deduction',
    component_type: 'Module', formula: '',
    amount: 0, module_source: 'late_deduction', is_taxable: false, based_on_attendance: true,
    display_on_payslip: true, configure_on_profile: false,
    description: 'Auto: daily rate x late-punch days from attendance.',
  },
  {
    group_code: 'GRP_LOAN', code: 'LOAN_EMI', name: 'Loan EMI',
    component_type: 'Module', formula: '',
    amount: 0, module_source: 'loan', is_taxable: false, based_on_attendance: false,
    display_on_payslip: true, configure_on_profile: false,
    description: 'Auto: sum of active loan EMIs for this employee.',
  },
  {
    group_code: 'GRP_ADVANCE', code: 'ADVANCE_RECOVERY', name: 'Salary Advance Recovery',
    component_type: 'Module', formula: '',
    amount: 0, module_source: 'salary_advance', is_taxable: false, based_on_attendance: false,
    display_on_payslip: true, configure_on_profile: false,
    description: 'Auto: monthly recovery instalment for salary advances.',
  },
  {
    group_code: 'GRP_MISC_DED', code: 'MISC_DED', name: 'Miscellaneous Deduction',
    component_type: 'Value', formula: '',
    amount: 0, is_taxable: false, based_on_attendance: false,
    display_on_payslip: true, configure_on_profile: false,
    description: 'Manual deductions — fines, damage recovery, etc.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
async function seed() {
  console.log(`\n🌱  Seeding payroll component groups + components for org_id = ${orgId}\n`);
  console.log(`📦  Groups to create : ${GROUPS.length}`);
  console.log(`🧩  Components to create : ${COMPONENTS.length}\n`);

  const groupIdMap = {};

  // ── Step 1: Upsert groups ─────────────────────────────────────────────────
  console.log('── GROUPS ──────────────────────────────────────────────────────');
  for (const g of GROUPS) {
    const existing = await db('payroll_component_groups')
      .where('organization_id', orgId)
      .whereRaw('LOWER(name) = LOWER(?)', [g.name])
      .whereNull('deleted_at')
      .first().catch(() => null);

    if (existing) {
      groupIdMap[g.code] = existing.id;
      console.log(`  ↩  [EXISTS] "${g.name}"  (id=${existing.id}, ${existing.category})`);
    } else {
      const [id] = await db('payroll_component_groups').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        name: g.name,
        category: g.category,
        display_order: g.display_order,
        is_taxable: g.is_taxable ? 1 : 0,
        disable_arrear: g.disable_arrear ? 1 : 0,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date(),
      });
      groupIdMap[g.code] = id;
      console.log(`  ✅  [CREATED] "${g.name}"  (id=${id}, ${g.category}, order=${g.display_order})`);
    }
  }

  // ── Step 2: Upsert components ─────────────────────────────────────────────
  console.log('\n── COMPONENTS ──────────────────────────────────────────────────');
  let created = 0, skipped = 0;

  for (const c of COMPONENTS) {
    const groupId = groupIdMap[c.group_code];
    if (!groupId) {
      console.warn(`  ⚠  No group found for code "${c.group_code}", skipping "${c.name}"`);
      skipped++;
      continue;
    }

    const existing = await db('payroll_components')
      .where('organization_id', orgId)
      .whereRaw('LOWER(name) = LOWER(?)', [c.name])
      .whereNull('deleted_at')
      .first().catch(() => null);

    if (existing) {
      console.log(`  ↩  [EXISTS] "${c.name}"  (id=${existing.id})`);
      skipped++;
      continue;
    }

    const [id] = await db('payroll_components').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      group_id: groupId,
      name: c.name,
      code: c.code,
      component_type: c.component_type,
      formula: c.formula || null,
      amount: c.amount || 0,
      module_source: c.module_source || null,
      is_taxable: c.is_taxable ? 1 : 0,
      based_on_attendance: c.based_on_attendance ? 1 : 0,
      is_non_cashable: c.is_non_cashable ? 1 : 0,
      is_active: 1,
      display_on_payslip: c.display_on_payslip ? 1 : 0,
      configure_on_profile: c.configure_on_profile ? 1 : 0,
      description: c.description || null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log(`  ✅  [CREATED] "${c.name}"  [${c.component_type}]  →  group: "${c.group_code}"  (id=${id})`);
    created++;
  }

  console.log(`\n✅  Done!  Created: ${created} components, Skipped (already exist): ${skipped}\n`);
  await db.destroy();
}

seed().catch((e) => {
  console.error('\n❌  Seed failed:', e.message, e.stack);
  process.exit(1);
});
