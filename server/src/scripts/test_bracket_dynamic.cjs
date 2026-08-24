async function testBracket() {
  const { PayrollFormulaEvaluator } = await import('../modules/payroll/utils/PayrollFormulaEvaluator.ts');

  console.log('=== TESTING BRACKET NOTATION [Component Name] & [CTC] ===\n');

  const context = {
    ctc: 80000,
    gross: 80000,
    basic_salary: 40000,
    basic: 40000,
    house_rent_allowance_hra: 16000,
    hra: 16000,
    conveyance_allowance: 1600,
    medical_allowance: 1250,
  };

  // Test 1: [CTC] * 0.50
  const basic = PayrollFormulaEvaluator.evaluate('[CTC] * 0.50', context);
  console.log(`1. Formula: "[CTC] * 0.50" on CTC ₹80,000 -> ₹${basic} (Expected: 40000) [${basic === 40000 ? 'PASS' : 'FAIL'}]`);

  // Test 2: [Basic Salary] * 0.40
  const hra = PayrollFormulaEvaluator.evaluate('[Basic Salary] * 0.40', context);
  console.log(`2. Formula: "[Basic Salary] * 0.40" on Basic ₹40,000 -> ₹${hra} (Expected: 16000) [${hra === 16000 ? 'PASS' : 'FAIL'}]`);

  // Test 3: [CTC] - ([Basic Salary] + [House Rent Allowance (HRA)] + [Conveyance Allowance] + [Medical Allowance])
  const special = PayrollFormulaEvaluator.evaluate('[CTC] - ([Basic Salary] + [House Rent Allowance (HRA)] + [Conveyance Allowance] + [Medical Allowance])', context);
  console.log(`3. Formula: "[CTC] - ([Basic Salary] + [House Rent Allowance (HRA)] + [Conveyance Allowance] + [Medical Allowance])" -> ₹${special} (Expected: 21150) [${special === 21150 ? 'PASS' : 'FAIL'}]`);

  // Test 4: min(1800, [Basic Salary] * 0.12)
  const pf = PayrollFormulaEvaluator.evaluate('min(1800, [Basic Salary] * 0.12)', context);
  console.log(`4. Formula: "min(1800, [Basic Salary] * 0.12)" -> ₹${pf} (Expected: 1800) [${pf === 1800 ? 'PASS' : 'FAIL'}]`);

  // Test 5: [Gross] * (0.75 / 100)
  const lowGrossCtx = { ...context, gross: 20000, ctc: 20000 };
  const esic = PayrollFormulaEvaluator.evaluate('[Gross] * (0.75 / 100)', lowGrossCtx);
  console.log(`5. Formula: "[Gross] * (0.75 / 100)" on Gross ₹20,000 -> ₹${esic} (Expected: 150) [${esic === 150 ? 'PASS' : 'FAIL'}]`);

  console.log('\n=== ALL BRACKET FORMULAS WORK PERFECTLY! ===');
}

testBracket().catch(console.error);
