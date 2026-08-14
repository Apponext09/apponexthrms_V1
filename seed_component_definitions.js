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

// Groups from DB (both orgs share group IDs 1-9)
// 1  = Basic Pay Group           (Earning)
// 2  = House Rent Allowance HRA  (Earning)
// 3  = Special & Personal Allowances (Earning)
// 4  = Conveyance & Travel Allowance (Earning)
// 5  = Medical & Health Allowance    (Earning)
// 6  = Provident Fund (PF)           (Deduction)
// 7  = Professional Tax (PT)         (Deduction)
// 8  = ESIC Contribution             (Deduction)
// 9  = Income Tax (TDS)              (Deduction)

// component_type enum: 'EARNING','DEDUCTION','EMPLOYER_CONTRIBUTION','REIMBURSEMENT','STATUTORY'
// calculation_type enum: 'FIXED_AMOUNT','PERCENTAGE_OF_COMPONENT','PERCENTAGE_OF_CTC','FORMULA_BASED','SLAB_BASED','ATTENDANCE_LINKED','EXTERNAL_LOOKUP'
// rounding_rule enum: 'ROUND_NEAREST','ROUND_UP','ROUND_DOWN','TRUNCATE'

const COMPONENTS = [
  // ── EARNINGS ───────────────────────────────────────────────────────────────
  {
    component_code:           'BASIC',
    component_name:           'Basic Pay',
    component_type:           'EARNING',
    calculation_type:         'PERCENTAGE_OF_CTC',
    formula_expression:       '0.50 * CTC',
    percentage_value:         50.0000,
    is_taxable:               true,
    is_part_of_pf_wage:       true,
    is_part_of_esi_wage:      true,
    is_prorated_by_attendance:true,
    min_value:                null,
    max_value:                null,
    rounding_rule:            'ROUND_NEAREST',
    display_order:            1,
    effective_from:           '2026-04-01',
    effective_to:             null,
  },
  {
    component_code:           'HRA',
    component_name:           'House Rent Allowance (HRA)',
    component_type:           'EARNING',
    calculation_type:         'PERCENTAGE_OF_COMPONENT',
    formula_expression:       '0.40 * BASIC',
    percentage_value:         40.0000,
    is_taxable:               true,
    is_part_of_pf_wage:       false,
    is_part_of_esi_wage:      false,
    is_prorated_by_attendance:true,
    min_value:                null,
    max_value:                null,
    rounding_rule:            'ROUND_NEAREST',
    display_order:            2,
    effective_from:           '2026-04-01',
    effective_to:             null,
  },
  {
    component_code:           'SPECIAL_ALLOWANCE',
    component_name:           'Special Allowance',
    component_type:           'EARNING',
    calculation_type:         'FORMULA_BASED',
    formula_expression:       'CTC - BASIC - HRA - CONVEYANCE - MEDICAL - PF - PT - ESI',
    percentage_value:         null,
    is_taxable:               true,
    is_part_of_pf_wage:       false,
    is_part_of_esi_wage:      true,
    is_prorated_by_attendance:true,
    min_value:                0.00,
    max_value:                null,
    rounding_rule:            'ROUND_NEAREST',
    display_order:            3,
    effective_from:           '2026-04-01',
    effective_to:             null,
  },
  {
    component_code:           'CONVEYANCE',
    component_name:           'Conveyance Allowance',
    component_type:           'EARNING',
    calculation_type:         'FIXED_AMOUNT',
    formula_expression:       null,
    percentage_value:         null,
    is_taxable:               false,
    is_part_of_pf_wage:       false,
    is_part_of_esi_wage:      false,
    is_prorated_by_attendance:true,
    min_value:                null,
    max_value:                1600.00,
    rounding_rule:            'ROUND_NEAREST',
    display_order:            4,
    effective_from:           '2026-04-01',
    effective_to:             null,
  },
  {
    component_code:           'LTA',
    component_name:           'Leave Travel Allowance (LTA)',
    component_type:           'EARNING',
    calculation_type:         'FIXED_AMOUNT',
    formula_expression:       null,
    percentage_value:         null,
    is_taxable:               false,
    is_part_of_pf_wage:       false,
    is_part_of_esi_wage:      false,
    is_prorated_by_attendance:false,
    min_value:                null,
    max_value:                null,
    rounding_rule:            'ROUND_NEAREST',
    display_order:            5,
    effective_from:           '2026-04-01',
    effective_to:             null,
  },
  {
    component_code:           'MEDICAL',
    component_name:           'Medical Allowance',
    component_type:           'EARNING',
    calculation_type:         'FIXED_AMOUNT',
    formula_expression:       null,
    percentage_value:         null,
    is_taxable:               false,
    is_part_of_pf_wage:       false,
    is_part_of_esi_wage:      false,
    is_prorated_by_attendance:false,
    min_value:                null,
    max_value:                15000.00,
    rounding_rule:            'ROUND_NEAREST',
    display_order:            6,
    effective_from:           '2026-04-01',
    effective_to:             null,
  },
  {
    component_code:           'OVERTIME',
    component_name:           'Overtime Pay',
    component_type:           'EARNING',
    calculation_type:         'ATTENDANCE_LINKED',
    formula_expression:       'OVERTIME_HOURS * (BASIC / 26 / 8)',
    percentage_value:         null,
    is_taxable:               true,
    is_part_of_pf_wage:       false,
    is_part_of_esi_wage:      true,
    is_prorated_by_attendance:true,
    min_value:                null,
    max_value:                null,
    rounding_rule:            'ROUND_NEAREST',
    display_order:            7,
    effective_from:           '2026-04-01',
    effective_to:             null,
  },
  {
    component_code:           'PERF_BONUS',
    component_name:           'Performance Bonus',
    component_type:           'EARNING',
    calculation_type:         'FIXED_AMOUNT',
    formula_expression:       null,
    percentage_value:         null,
    is_taxable:               true,
    is_part_of_pf_wage:       false,
    is_part_of_esi_wage:      false,
    is_prorated_by_attendance:false,
    min_value:                null,
    max_value:                null,
    rounding_rule:            'ROUND_NEAREST',
    display_order:            8,
    effective_from:           '2026-04-01',
    effective_to:             null,
  },
  // ── DEDUCTIONS ─────────────────────────────────────────────────────────────
  {
    component_code:           'EPF_EE',
    component_name:           'Employee Provident Fund (EPF)',
    component_type:           'DEDUCTION',
    calculation_type:         'FORMULA_BASED',
    formula_expression:       'MIN(1800, 0.12 * BASIC)',
    percentage_value:         12.0000,
    is_taxable:               false,
    is_part_of_pf_wage:       false,
    is_part_of_esi_wage:      false,
    is_prorated_by_attendance:true,
    min_value:                0.00,
    max_value:                1800.00,
    rounding_rule:            'ROUND_NEAREST',
    display_order:            9,
    effective_from:           '2026-04-01',
    effective_to:             null,
  },
  {
    component_code:           'EPF_ER',
    component_name:           'Employer PF Contribution (EPF)',
    component_type:           'EMPLOYER_CONTRIBUTION',
    calculation_type:         'FORMULA_BASED',
    formula_expression:       'MIN(1800, 0.12 * BASIC)',
    percentage_value:         12.0000,
    is_taxable:               false,
    is_part_of_pf_wage:       false,
    is_part_of_esi_wage:      false,
    is_prorated_by_attendance:true,
    min_value:                0.00,
    max_value:                1800.00,
    rounding_rule:            'ROUND_NEAREST',
    display_order:            10,
    effective_from:           '2026-04-01',
    effective_to:             null,
  },
  {
    component_code:           'ESIC_EE',
    component_name:           'Employee State Insurance (ESIC)',
    component_type:           'DEDUCTION',
    calculation_type:         'FORMULA_BASED',
    formula_expression:       'GROSS <= 21000 ? 0.0075 * GROSS : 0',
    percentage_value:         0.7500,
    is_taxable:               false,
    is_part_of_pf_wage:       false,
    is_part_of_esi_wage:      false,
    is_prorated_by_attendance:true,
    min_value:                0.00,
    max_value:                null,
    rounding_rule:            'ROUND_NEAREST',
    display_order:            11,
    effective_from:           '2026-04-01',
    effective_to:             null,
  },
  {
    component_code:           'PT',
    component_name:           'Professional Tax (PT)',
    component_type:           'STATUTORY',
    calculation_type:         'SLAB_BASED',
    formula_expression:       'GROSS > 15000 ? 200 : 0',
    percentage_value:         null,
    is_taxable:               false,
    is_part_of_pf_wage:       false,
    is_part_of_esi_wage:      false,
    is_prorated_by_attendance:false,
    min_value:                0.00,
    max_value:                200.00,
    rounding_rule:            'ROUND_NEAREST',
    display_order:            12,
    effective_from:           '2026-04-01',
    effective_to:             null,
  },
  {
    component_code:           'TDS',
    component_name:           'Tax Deducted at Source (TDS)',
    component_type:           'STATUTORY',
    calculation_type:         'SLAB_BASED',
    formula_expression:       'TAXABLE_INCOME_SLAB',
    percentage_value:         null,
    is_taxable:               false,
    is_part_of_pf_wage:       false,
    is_part_of_esi_wage:      false,
    is_prorated_by_attendance:false,
    min_value:                0.00,
    max_value:                null,
    rounding_rule:            'ROUND_NEAREST',
    display_order:            13,
    effective_from:           '2026-04-01',
    effective_to:             null,
  },
  {
    component_code:           'GRATUITY',
    component_name:           'Gratuity',
    component_type:           'EMPLOYER_CONTRIBUTION',
    calculation_type:         'FORMULA_BASED',
    formula_expression:       '(BASIC / 26) * 15 / 12',
    percentage_value:         null,
    is_taxable:               false,
    is_part_of_pf_wage:       false,
    is_part_of_esi_wage:      false,
    is_prorated_by_attendance:false,
    min_value:                null,
    max_value:                null,
    rounding_rule:            'ROUND_NEAREST',
    display_order:            14,
    effective_from:           '2026-04-01',
    effective_to:             null,
  },
];

const orgIds = [68, 70];

async function run() {
  try {
    await db.raw('SET FOREIGN_KEY_CHECKS = 0');

    // Clear existing
    const deleted = await db('pay_component_definitions').delete();
    console.log('Deleted ' + deleted + ' existing component definitions');

    let inserted = 0;
    for (const orgId of orgIds) {
      for (const comp of COMPONENTS) {
        await db('pay_component_definitions').insert({
          uuid:                      uuidv4(),
          organization_id:           orgId,
          component_code:            comp.component_code + '_' + orgId,
          component_name:            comp.component_name,
          component_type:            comp.component_type,
          calculation_type:          comp.calculation_type,
          formula_expression:        comp.formula_expression || null,
          percentage_value:          comp.percentage_value || null,
          reference_component_id:    null,
          slab_table_id:             null,
          is_taxable:                comp.is_taxable ? 1 : 0,
          is_part_of_pf_wage:        comp.is_part_of_pf_wage ? 1 : 0,
          is_part_of_esi_wage:       comp.is_part_of_esi_wage ? 1 : 0,
          is_prorated_by_attendance: comp.is_prorated_by_attendance ? 1 : 0,
          min_value:                 comp.min_value !== undefined ? comp.min_value : null,
          max_value:                 comp.max_value !== undefined ? comp.max_value : null,
          rounding_rule:             comp.rounding_rule,
          display_order:             comp.display_order,
          effective_from:            comp.effective_from || null,
          effective_to:              comp.effective_to || null,
          applicable_country:        'IN',
        });
        inserted++;
      }
    }

    await db.raw('SET FOREIGN_KEY_CHECKS = 1');

    // Verify
    const result = await db('pay_component_definitions')
      .select('id', 'organization_id', 'component_name', 'component_type', 'calculation_type')
      .orderBy('organization_id')
      .orderBy('display_order');

    console.log('\nCreated ' + inserted + ' component definitions:\n');
    result.forEach(c => {
      console.log(
        'Org ' + c.organization_id + ' | ' +
        c.component_name.padEnd(40) + ' | ' +
        c.component_type.padEnd(22) + ' | ' +
        c.calculation_type
      );
    });
    console.log('\nDone!');
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await db.destroy();
  }
}

run();
