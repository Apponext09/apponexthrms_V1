/**
 * FIX ALL PAYROLL COMPONENTS — CONDITIONS + EMPLOYEE SETTINGS
 * ============================================================
 * This script fixes EVERY component to have correct:
 *  - component_type, calc_type, formula, amount
 *  - is_statutory, is_active, non_cashable, based_on_attendance
 *  - boundary_type, min_amount, max_amount
 *  - condition_on, condition_operator, condition_value1, condition_value2
 *  - gender_filter, grades, departments, locations, employees, months
 */

const knex = require('knex');
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

// Each entry maps to a component ID in payroll_components table
// NO_CONDITION = standard component applies to all employees
const NO_CONDITION = {
  condition_on:        'Choose',
  condition_operator:  'Choose',
  condition_value1:    null,
  condition_value2:    null,
  gender_filter:       'All',
  grades:              JSON.stringify([]),
  departments:         JSON.stringify([]),
  locations:           JSON.stringify([]),
  employees:           JSON.stringify([]),
  months:              null,
};

const fixes = [
  // ─────────────────────────────────────────────────────────────────────────
  // ID 1 — Adjustment
  // BUG: Female only, grade S1 only, condition Gross > 120 (nonsense)
  // FIX: Adjustment = ad-hoc amount for any employee. No conditions.
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 1,
    name: 'Adjustment',
    component_type:    'Value',
    calc_type:         'fixed',
    amount:            0.00,
    formula:           null,
    is_statutory:      false,
    is_active:         true,
    non_cashable:      false,
    based_on_attendance: false,
    boundary_type:     'Choose',
    min_amount:        0,
    max_amount:        0,
    ...NO_CONDITION,   // ✅ Apply to ALL employees, no restriction
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ID 101 — Basic Pay
  // FIX: 50% of Gross, applies to ALL employees
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 101,
    name: 'Basic Pay',
    component_type:    'Derived',
    calc_type:         'derived',
    amount:            50.00,
    formula:           '0.50 * GROSS',
    is_statutory:      false,
    is_active:         true,
    non_cashable:      false,
    based_on_attendance: true,   // reduced if absent
    boundary_type:     'Choose',
    min_amount:        0,
    max_amount:        0,
    ...NO_CONDITION,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ID 102 — House Rent Allowance (HRA)
  // FIX: 40% of Basic, applies to ALL employees
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 102,
    name: 'House Rent Allowance (HRA)',
    component_type:    'Derived',
    calc_type:         'derived',
    amount:            40.00,
    formula:           '0.40 * BASIC',
    is_statutory:      false,
    is_active:         true,
    non_cashable:      false,
    based_on_attendance: true,
    boundary_type:     'Choose',
    min_amount:        0,
    max_amount:        0,
    ...NO_CONDITION,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ID 3 — HRA (duplicate/old, deactivate it — use ID 102 above)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 3,
    name: 'HRA',
    component_type:    'Derived',
    calc_type:         'derived',
    amount:            40.00,
    formula:           '0.40 * BASIC',
    is_statutory:      false,
    is_active:         false,   // ❌ Deactivated — use ID 102 instead
    non_cashable:      false,
    based_on_attendance: true,
    boundary_type:     'Choose',
    min_amount:        0,
    max_amount:        0,
    ...NO_CONDITION,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ID 103 — Special Allowance
  // FIX: Balancing component = CTC - (Basic + HRA + Other). All employees.
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 103,
    name: 'Special Allowance',
    component_type:    'Derived',
    calc_type:         'derived',
    amount:            0.00,
    formula:           'GROSS - BASIC - HRA - CONVEYANCE - MEDICAL',
    is_statutory:      false,
    is_active:         true,
    non_cashable:      false,
    based_on_attendance: true,
    boundary_type:     'Min',
    min_amount:        0,       // can't be negative
    max_amount:        0,
    ...NO_CONDITION,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ID 4 — Medical & Healthcare (duplicate/old, deactivate)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 4,
    name: 'Medical & Healthcare',
    component_type:    'Value',
    calc_type:         'fixed',
    amount:            0.00,
    formula:           null,
    is_statutory:      false,
    is_active:         false,  // ❌ Deactivated — use ID 105 Medical Allowance
    non_cashable:      false,
    based_on_attendance: false,
    boundary_type:     'Choose',
    min_amount:        0,
    max_amount:        0,
    ...NO_CONDITION,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ID 5 — Medical & Healthcare premium (duplicate/old, deactivate)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 5,
    name: 'Medical & Healthcare premium',
    component_type:    'Value',
    calc_type:         'fixed',
    amount:            0.00,
    formula:           null,
    is_statutory:      false,
    is_active:         false,  // ❌ Deactivated — duplicate
    non_cashable:      false,
    based_on_attendance: false,
    boundary_type:     'Choose',
    min_amount:        0,
    max_amount:        0,
    ...NO_CONDITION,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ID 104 — Conveyance Allowance
  // FIX: Fixed ₹1600/month, tax-exempt, for all employees
  // NOTE: Income tax exemption limit is ₹1600/month
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 104,
    name: 'Conveyance Allowance',
    component_type:    'Value',
    calc_type:         'fixed',
    amount:            1600.00,
    formula:           null,
    is_statutory:      false,
    is_active:         true,
    non_cashable:      false,
    based_on_attendance: true,  // pro-rated if absent
    boundary_type:     'Max',
    min_amount:        0,
    max_amount:        1600,    // tax-exempt cap
    ...NO_CONDITION,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ID 105 — Medical Allowance
  // FIX: Fixed ₹1250/month, applies to ALL employees
  // NOTE: ₹15,000/year = ₹1,250/month is standard tax-exempt medical allowance
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 105,
    name: 'Medical Allowance',
    component_type:    'Value',
    calc_type:         'fixed',
    amount:            1250.00,
    formula:           null,
    is_statutory:      false,
    is_active:         true,
    non_cashable:      false,
    based_on_attendance: false, // paid even if absent (medical benefit)
    boundary_type:     'Max',
    min_amount:        0,
    max_amount:        1250,
    ...NO_CONDITION,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ID 106 — Employee PF (12%)
  // FIX: Statutory deduction. 12% of Basic capped at ₹1800/month.
  // CONDITION: Only for non-interns (handled in PayrollService via struct.pf_enabled)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 106,
    name: 'Employee PF (12%)',
    component_type:    'Derived',
    calc_type:         'derived',
    amount:            12.00,
    formula:           'LEAST(1800, 0.12 * BASIC)',
    is_statutory:      true,
    is_active:         true,
    non_cashable:      false,
    based_on_attendance: true,
    boundary_type:     'Max',
    min_amount:        0,
    max_amount:        1800,    // statutory PF cap on ₹15,000 basic
    ...NO_CONDITION,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ID 107 — Professional Tax (PT)
  // FIX: State statutory deduction. ₹200/month if Gross > ₹15,000.
  // CONDITION: Apply only when Gross > 15000 (Maharashtra slab)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 107,
    name: 'Professional Tax (PT)',
    component_type:    'Derived',
    calc_type:         'derived',
    amount:            200.00,
    formula:           'GROSS > 15000 ? 200 : (GROSS > 10000 ? 175 : 0)',
    is_statutory:      true,
    is_active:         true,
    non_cashable:      false,
    based_on_attendance: false,
    boundary_type:     'Max',
    min_amount:        0,
    max_amount:        200,
    // ✅ CONDITION: Only apply when Gross > 10000 (else PT = 0 anyway, but filter for clarity)
    condition_on:      'Gross',
    condition_operator:'Greater',
    condition_value1:  10000,
    condition_value2:  null,
    gender_filter:     'All',
    grades:            JSON.stringify([]),
    departments:       JSON.stringify([]),
    locations:         JSON.stringify([]),
    employees:         JSON.stringify([]),
    months:            null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ID 108 — ESIC Contribution (0.75%)
  // FIX: Statutory. 0.75% of Gross only if Gross <= ₹21,000/month
  // CONDITION: Gross <= 21000 (ESIC eligibility limit)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 108,
    name: 'ESIC Contribution (0.75%)',
    component_type:    'Derived',
    calc_type:         'derived',
    amount:            0.75,
    formula:           'GROSS <= 21000 ? 0.0075 * GROSS : 0',
    is_statutory:      true,
    is_active:         true,
    non_cashable:      false,
    based_on_attendance: true,
    boundary_type:     'Max',
    min_amount:        0,
    max_amount:        158,    // 0.75% of 21000 = 157.5 → 158
    // ✅ CONDITION: Only apply when Gross <= 21000 (ESIC eligibility)
    condition_on:      'Gross',
    condition_operator:'LessThanEqual',
    condition_value1:  21000,
    condition_value2:  null,
    gender_filter:     'All',
    grades:            JSON.stringify([]),
    departments:       JSON.stringify([]),
    locations:         JSON.stringify([]),
    employees:         JSON.stringify([]),
    months:            null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ID 109 — Income Tax / TDS
  // FIX: Derived from taxable income slab. Only applies when annual income > ₹5L
  // CONDITION: Apply when Gross > 41666/month (₹5L annual = ₹41,666/month)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 109,
    name: 'Income Tax (TDS)',
    component_type:    'Derived',
    calc_type:         'derived',
    amount:            0.00,
    formula:           'TAXABLE_INCOME_SLAB',
    is_statutory:      true,
    is_active:         true,
    non_cashable:      false,
    based_on_attendance: false,
    boundary_type:     'Choose',
    min_amount:        0,
    max_amount:        0,
    // ✅ CONDITION: Only apply when Gross > 41666/month (annual > 5L, new tax regime basic exemption)
    condition_on:      'Gross',
    condition_operator:'Greater',
    condition_value1:  41666,
    condition_value2:  null,
    gender_filter:     'All',
    grades:            JSON.stringify([]),
    departments:       JSON.stringify([]),
    locations:         JSON.stringify([]),
    employees:         JSON.stringify([]),
    months:            null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ID 110 — Performance Bonus
  // FIX: One-time bonus, paid in specific months (March/December typically)
  // CONDITION: No automatic condition — HR adds manually. Months = [3, 12]
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 110,
    name: 'Performance Bonus',
    component_type:    'Value',
    calc_type:         'fixed',
    amount:            0.00,
    formula:           null,
    is_statutory:      false,
    is_active:         true,
    non_cashable:      false,
    based_on_attendance: false,
    boundary_type:     'Choose',
    min_amount:        0,
    max_amount:        0,
    ...NO_CONDITION,
    months:            JSON.stringify([3, 12]),  // March & December payroll
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ID 111 — Provident Fund PF (ungrouped duplicate)
  // FIX: Same as 106 but no group_id. Keep active with same proper formula.
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 111,
    name: 'Provident Fund (PF)',
    component_type:    'Derived',
    calc_type:         'derived',
    amount:            12.00,
    formula:           'LEAST(1800, 0.12 * BASIC)',
    is_statutory:      true,
    is_active:         false,  // ❌ Use ID 106 (grouped) instead
    non_cashable:      false,
    based_on_attendance: true,
    boundary_type:     'Max',
    min_amount:        0,
    max_amount:        1800,
    ...NO_CONDITION,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ID 112 — Employee State Insurance ESI (ungrouped duplicate)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 112,
    name: 'Employee State Insurance (ESI)',
    component_type:    'Derived',
    calc_type:         'derived',
    amount:            0.75,
    formula:           'GROSS <= 21000 ? 0.0075 * GROSS : 0',
    is_statutory:      true,
    is_active:         false,  // ❌ Use ID 108 (grouped) instead
    non_cashable:      false,
    based_on_attendance: true,
    boundary_type:     'Max',
    min_amount:        0,
    max_amount:        158,
    condition_on:      'Gross',
    condition_operator:'LessThanEqual',
    condition_value1:  21000,
    condition_value2:  null,
    gender_filter:     'All',
    grades:            JSON.stringify([]),
    departments:       JSON.stringify([]),
    locations:         JSON.stringify([]),
    employees:         JSON.stringify([]),
    months:            null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ID 113 — Executive Travel Allowance
  // FIX: 15% of Basic, only for senior grades (Director, VP, CXO)
  // CONDITION: Grades = [Director, VP, CXO]
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 113,
    name: 'Executive Travel Allowance',
    component_type:    'Derived',
    calc_type:         'derived',
    amount:            15.00,
    formula:           '0.15 * BASIC',
    is_statutory:      false,
    is_active:         true,
    non_cashable:      false,
    based_on_attendance: true,
    boundary_type:     'Choose',
    min_amount:        0,
    max_amount:        0,
    condition_on:      'Choose',
    condition_operator:'Choose',
    condition_value1:  null,
    condition_value2:  null,
    gender_filter:     'All',
    // ✅ Only for senior grades
    grades:            JSON.stringify(['CXO', 'VP', 'Director', 'Senior Manager']),
    departments:       JSON.stringify([]),
    locations:         JSON.stringify([]),
    employees:         JSON.stringify([]),
    months:            null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ID 114 — Men Technical Safety Allowance
  // FIX: ₹1500 only for Male employees in technical roles
  // CONDITION: gender = Male (keep as-is, this IS intentional)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 114,
    name: 'Men Technical Safety Allowance',
    component_type:    'Value',
    calc_type:         'fixed',
    amount:            1500.00,
    formula:           null,
    is_statutory:      false,
    is_active:         true,
    non_cashable:      false,
    based_on_attendance: false,
    boundary_type:     'Max',
    min_amount:        0,
    max_amount:        1500,
    condition_on:      'Choose',
    condition_operator:'Choose',
    condition_value1:  null,
    condition_value2:  null,
    gender_filter:     'Male',  // ✅ Only for Male employees
    grades:            JSON.stringify([]),
    departments:       JSON.stringify([]),
    locations:         JSON.stringify([]),
    employees:         JSON.stringify([]),
    months:            null,
  },
];

async function run() {
  try {
    console.log('Fixing ' + fixes.length + ' components...\n');

    for (const fix of fixes) {
      const { id, ...data } = fix;
      await db('payroll_components').where('id', id).update({
        name:                data.name,
        component_type:      data.component_type,
        calc_type:           data.calc_type,
        amount:              data.amount,
        formula:             data.formula,
        is_statutory:        data.is_statutory ? 1 : 0,
        is_active:           data.is_active ? 1 : 0,
        non_cashable:        data.non_cashable ? 1 : 0,
        based_on_attendance: data.based_on_attendance ? 1 : 0,
        boundary_type:       data.boundary_type,
        min_amount:          data.min_amount,
        max_amount:          data.max_amount,
        condition_on:        data.condition_on,
        condition_operator:  data.condition_operator,
        condition_value1:    data.condition_value1,
        condition_value2:    data.condition_value2,
        gender_filter:       data.gender_filter,
        grades:              data.grades,
        departments:         data.departments,
        locations:           data.locations,
        employees:           data.employees,
        months:              data.months,
        updated_at:          new Date(),
      });

      const status = data.is_active ? '✅ ACTIVE' : '⚫ DEACTIVATED';
      const cond = data.condition_on !== 'Choose' && data.condition_on
        ? '  [COND: ' + data.condition_on + ' ' + data.condition_operator + ' ' + data.condition_value1 + ']'
        : '';
      const gradeArr = data.grades ? JSON.parse(data.grades) : [];
      const gradeStr = gradeArr.length > 0 ? '  [GRADES: ' + gradeArr.join(', ') + ']' : '';
      const genderStr = data.gender_filter !== 'All' ? '  [GENDER: ' + data.gender_filter + ']' : '';
      const monthArr = data.months ? JSON.parse(data.months) : [];
      const monthStr = monthArr.length > 0 ? '  [MONTHS: ' + monthArr.join(', ') + ']' : '';

      console.log(status + ' | ID ' + String(id).padStart(3) + ' | ' + data.name.padEnd(40) + cond + gradeStr + genderStr + monthStr);
    }

    console.log('\n── SUMMARY ─────────────────────────────────────────────────────');
    const active = await db('payroll_components').whereNull('deleted_at').where('is_active', 1).count('* as c').first();
    const inactive = await db('payroll_components').whereNull('deleted_at').where('is_active', 0).count('* as c').first();
    const statutory = await db('payroll_components').whereNull('deleted_at').where('is_statutory', 1).count('* as c').first();
    const withCondition = await db('payroll_components').whereNull('deleted_at').whereNotNull('condition_value1').whereNot('condition_on', 'Choose').count('* as c').first();

    console.log('Active components:       ' + active.c);
    console.log('Deactivated (duplicates): ' + inactive.c);
    console.log('Statutory components:    ' + statutory.c);
    console.log('With real conditions:    ' + withCondition.c);
    console.log('\nDone!');
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await db.destroy();
  }
}

run();
