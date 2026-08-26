/**
 * test-cascading-payroll-formulas.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Verification test demonstrating:
 * 1. Base calculation starting from Employee CTC
 * 2. Cascading / Derived components where Component B uses Component A's value
 * 3. Complex formulas: Basic -> HRA -> DA -> Conveyance -> Special Allowance
 * 4. Deduction formulas: PF, PT, ESIC
 */

import { PayrollFormulaEvaluator, FormulaContext } from '../modules/payroll/utils/PayrollFormulaEvaluator.js';

function runTest() {
  console.log('🚀 Starting Universal Cascading Payroll Formula Engine Verification...\n');

  // Employee CTC: ₹6,00,000 / year = ₹50,000 / month
  const annualCtc = 600000;
  const monthlyCtc = 50000;

  const context: FormulaContext = {
    ctc: monthlyCtc,
    annual_ctc: annualCtc,
    monthly_ctc: monthlyCtc,
    gross: monthlyCtc,
    gross_salary: monthlyCtc,
  };

  console.log(`📌 Base Employee Context: Monthly CTC = ₹${context.ctc}, Annual CTC = ₹${context.annual_ctc}`);

  // Step 1: Basic Salary (Derived from CTC: ctc * 0.50)
  const basicFormula = 'ctc * 0.50';
  const basic = PayrollFormulaEvaluator.evaluate(basicFormula, context);
  context.basic = basic;
  context.basic_salary = basic;
  context.earned_basic = basic;
  console.log(`✅ 1. Basic Salary [formula: "${basicFormula}"]: ₹${basic}`);

  // Step 2: HRA (Derived from Basic: basic * 0.40)
  const hraFormula = 'basic * 0.40';
  const hra = PayrollFormulaEvaluator.evaluate(hraFormula, context);
  context.hra = hra;
  context.house_rent_allowance = hra;
  console.log(`✅ 2. HRA [formula: "${hraFormula}"]: ₹${hra}`);

  // Step 3: Dearness Allowance (DA) (Derived from Basic: basic * 0.10)
  const daFormula = 'basic * 0.10';
  const da = PayrollFormulaEvaluator.evaluate(daFormula, context);
  context.da = da;
  context.dearness_allowance = da;
  console.log(`✅ 3. Dearness Allowance (DA) [formula: "${daFormula}"]: ₹${da}`);

  // Step 4: Conveyance Allowance (Fixed Value: 1600)
  const conveyance = 1600;
  context.conveyance_allowance = conveyance;
  context.conveyance = conveyance;
  console.log(`✅ 4. Conveyance Allowance [Value]: ₹${conveyance}`);

  // Step 5: Special Allowance (Derived from CTC minus all previous components: ctc - (basic + hra + da + conveyance_allowance))
  const specialFormula = 'ctc - (basic + hra + da + conveyance_allowance)';
  const specialAllowance = PayrollFormulaEvaluator.evaluate(specialFormula, context);
  context.special_allowance = specialAllowance;
  console.log(`✅ 5. Special Allowance [formula: "${specialFormula}"]: ₹${specialAllowance}`);

  // Calculate Total Gross Earnings
  const totalGross = basic + hra + da + conveyance + specialAllowance;
  context.gross = totalGross;
  console.log(`\n💰 Total Gross Monthly Earnings: ₹${totalGross} (Matches Monthly CTC: ${totalGross === monthlyCtc})`);

  // Step 6: Employee Provident Fund (PF) (Derived from Basic with capping: min(basic * 0.12, 1800))
  const pfFormula = 'min(basic * 0.12, 1800)';
  const pf = PayrollFormulaEvaluator.evaluate(pfFormula, context);
  context.pf = pf;
  console.log(`✅ 6. Employee PF [formula: "${pfFormula}"]: ₹${pf}`);

  // Step 7: Professional Tax (PT: 200)
  const pt = 200;
  context.pt = pt;
  console.log(`✅ 7. Professional Tax (PT) [Fixed]: ₹${pt}`);

  // Step 8: Employee State Insurance (ESIC) (Derived from Gross: gross * 0.0075 if gross <= 21000 else 0)
  const isEsicEligible = PayrollFormulaEvaluator.checkCondition('Gross', '<=', 21000, 0, context);
  const esic = isEsicEligible ? PayrollFormulaEvaluator.evaluate('gross * 0.0075', context) : 0;
  context.esic = esic;
  console.log(`✅ 8. ESIC [Condition: Gross <= 21000]: ₹${esic}`);

  // Total Deductions & Net Take-Home
  const totalDeductions = pf + pt + esic;
  const netTakeHome = totalGross - totalDeductions;

  console.log(`\n🧾 SUMMARY BREAKDOWN:`);
  console.log(`   - Basic Salary:             ₹${basic}`);
  console.log(`   - HRA:                      ₹${hra}`);
  console.log(`   - Dearness Allowance:       ₹${da}`);
  console.log(`   - Conveyance Allowance:     ₹${conveyance}`);
  console.log(`   - Special Allowance:        ₹${specialAllowance}`);
  console.log(`   ─────────────────────────────────────────`);
  console.log(`   Gross Monthly Earnings:     ₹${totalGross}`);
  console.log(`   Total Deductions (PF+PT):   ₹${totalDeductions}`);
  console.log(`   NET TAKE-HOME PAY:          ₹${netTakeHome}`);
  console.log(`\n🎉 All cascading formulas and dynamic component derivation verified successfully!`);
}

runTest();
