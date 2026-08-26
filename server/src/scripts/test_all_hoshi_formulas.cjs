const { PayrollFormulaEvaluator } = require('../modules/payroll/utils/PayrollFormulaEvaluator');

// Mock a complete employee context
const ctx = {
  ctc: 50000,
  monthly_ctc: 50000,
  annual_ctc: 600000,
  gross: 50000,
  basic: 25000,
  basic_earned: 25000,
  hra: 10000,
  hra_earned: 10000,
  conveyance: 1250,
  conveyance_allowance: 2500,
  medical_allowance: 2500,
  professional_allowance: 12500,
  professional_allowance_earned: 12500,
  special_allowance: 11250,
  standard_allowance: 5000,
  salary_input: 50000,
  epf_eps_wages: 15000,
  pf_employee: 1800,
  eps_component: 1250,
  edli_wages: 15000,
  esi_wages: 37500,
  system_extra_paid_days: 2,
  system_calc_days: 30,
  paid_days: 30,
  total_days: 30,
  attendance_factor: 1
};

const testFormulas = [
  { name: 'Basic 50%', formula: '(50 * [CTC])/100', expected: 25000 },
  { name: 'Basic 40%', formula: '(40 * [CTC])/100', expected: 20000 },
  { name: 'Basic Earned Tag', formula: '[BASIC]', expected: 25000 },
  { name: 'Conveyance 25%', formula: '[BASIC]*0.20', expected: 5000 },
  { name: 'Conveyance Allowance', formula: '(5 * [CTC])/100', expected: 2500 },
  { name: 'HRA', formula: '[BASIC]*0.4', expected: 10000 },
  { name: 'Medical Allowance', formula: '(5 * [CTC])/100', expected: 2500 },
  { name: 'Professional Allowance', formula: '(25 * [CTC])/100', expected: 12500 },
  { name: 'Special Allowance Residual', formula: '[SALARY_INPUT]-([BASIC]+[HRA]+[CONVEYANCE])', expected: 13750 },
  { name: 'Admin Charges', formula: '[EPF_EPS_WAGES] * 0.005', expected: 75 },
  { name: 'EDLI Charges', formula: '[EPF_EPS_WAGES] * 0.005', expected: 75 },
  { name: 'EPF and EPS Diff with semicolon', formula: 'round([PF_EMPLOYEE] - [EPS_COMPONENT]);', expected: 550 },
  { name: 'EPS Component calculation', formula: 'round((8.33 / 100) * [EPF_EPS_WAGES])', expected: 1250 },
  { name: 'EPS Wages Tag with semicolon', formula: '[EPF_EPS_WAGES];', expected: 15000 },
  { name: 'ESI Wages formula', formula: '([SALARY_INPUT]-[CONVEYANCE])*0.75', expected: 36562.5 },
  { name: 'PF Employer 12%', formula: '(12 * [BASIC])/100', expected: 3000 },
  { name: 'Ternary Extra Pay', formula: '([SYSTEM_EXTRA_PAID_DAYS] > 0 ) ? [SYSTEM_EXTRA_PAID_DAYS]*([GROSS]/[SYSTEM_CALC_DAYS] ) : 0', expected: 3333.33 }
];

console.log('=== TESTING PAYROLL FORMULA EVALUATION ENGINE ===\n');

let passed = 0;
for (const t of testFormulas) {
  const result = PayrollFormulaEvaluator.evaluate(t.formula, ctx);
  const isMatch = Math.abs(result - t.expected) < 0.02;
  console.log(`${isMatch ? '✅' : '❌'} ${t.name}`);
  console.log(`   Formula:  ${t.formula}`);
  console.log(`   Expected: ${t.expected} | Got: ${result}\n`);
  if (isMatch) passed++;
}

console.log(`Summary: ${passed} / ${testFormulas.length} formulas passed.`);
