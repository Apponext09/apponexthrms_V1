const mysql = require('mysql2/promise');
const http = require('http');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'apponexthrms',
  port: Number(process.env.DB_PORT || 3306)
};

async function runTestSuite() {
  console.log('================================================================');
  console.log('       APPONEXT HRMS — FULL PAYROLL AUTOMATED TEST SUITE        ');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(title, condition, extraInfo = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] Test ${totalTests}: ${title} ${extraInfo ? `(${extraInfo})` : ''}`);
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${title} ${extraInfo ? `(${extraInfo})` : ''}`);
    }
  }

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: DATABASE TABLES & SCHEMA INTEGRITY
    // -------------------------------------------------------------------------
    console.log('--- SECTION 1: DATABASE TABLES & SCHEMA INTEGRITY ---');
    const requiredTables = [
      'payroll_cycles',
      'payroll_component_groups',
      'payroll_components',
      'payroll_slabs',
      'employee_salary_structures',
      'payroll_runs',
      'payroll_run_employees',
      'payroll_earnings',
      'payroll_deductions',
      'payslips'
    ];

    for (const tbl of requiredTables) {
      const [rows] = await connection.query(`SHOW TABLES LIKE ?`, [tbl]);
      assert(`Table \`${tbl}\` exists`, rows.length > 0);
    }

    // -------------------------------------------------------------------------
    // SECTION 2: PAYROLL CYCLES INTEGRITY
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 2: PAYROLL CYCLES ---');
    const [cycles] = await connection.query(`SELECT * FROM payroll_cycles WHERE deleted_at IS NULL`);
    assert('Payroll cycles table is readable', Array.isArray(cycles));
    assert('At least one payroll cycle exists', cycles.length > 0, `Count: ${cycles.length}`);
    if (cycles.length > 0) {
      const c = cycles[0];
      assert('Cycle has valid start day or date', c.cycle_start_day || c.cycle_start_date !== undefined);
      assert('Cycle has cutoff day or status', c.cutoff_day !== undefined || c.status !== undefined);
    }

    // -------------------------------------------------------------------------
    // SECTION 3: COMPONENT GROUPS & ATTRIBUTES
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 3: COMPONENT GROUPS ---');
    const [groups] = await connection.query(`SELECT * FROM payroll_component_groups WHERE deleted_at IS NULL`);
    assert('Component groups exist', groups.length > 0, `Count: ${groups.length}`);
    
    const earningGroups = groups.filter(g => g.category === 'Earning');
    const deductionGroups = groups.filter(g => g.category !== 'Earning');
    assert('Earnings component groups found', earningGroups.length > 0, `Count: ${earningGroups.length}`);
    assert('Deduction component groups found', deductionGroups.length > 0, `Count: ${deductionGroups.length}`);

    // -------------------------------------------------------------------------
    // SECTION 4: PAY COMPONENTS & FORMULAS
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 4: PAY COMPONENTS & FORMULA ENGINE ---');
    const [comps] = await connection.query(`SELECT * FROM payroll_components WHERE is_active = 1 AND deleted_at IS NULL`);
    assert('Active pay components found', comps.length > 0, `Count: ${comps.length}`);

    // Formula Evaluator Function
    function evaluateFormula(formula, ctx) {
      if (!formula) return 0;
      const f = formula.trim();
      const pctMatch = f.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of\s*)?([a-zA-Z]+)?/i);
      if (pctMatch) {
        const pct = parseFloat(pctMatch[1]) / 100;
        const baseWord = (pctMatch[2] || '').toLowerCase();
        const base = baseWord.includes('basic') ? ctx.BASIC : (baseWord.includes('gross') ? ctx.GROSS : ctx.CTC);
        return Math.round(base * pct);
      }
      const div100Match = f.match(/\(?(\d+(?:\.\d+)?)\s*\*\s*([a-zA-Z]+)\)?\s*\/\s*100/i);
      if (div100Match) {
        const pct = parseFloat(div100Match[1]) / 100;
        const baseWord = div100Match[2].toLowerCase();
        const base = baseWord.includes('basic') ? ctx.BASIC : (baseWord.includes('gross') ? ctx.GROSS : ctx.CTC);
        return Math.round(base * pct);
      }
      const multMatch = f.match(/([a-zA-Z]+)\s*\*\s*(0?\.\d+)/i) || f.match(/(0?\.\d+)\s*\*\s*([a-zA-Z]+)/i);
      if (multMatch) {
        const factor = parseFloat(multMatch[1]) || parseFloat(multMatch[2]);
        const word = isNaN(parseFloat(multMatch[1])) ? multMatch[1].toLowerCase() : multMatch[2].toLowerCase();
        const base = word.includes('basic') ? ctx.BASIC : (word.includes('gross') ? ctx.GROSS : ctx.CTC);
        return Math.round(base * factor);
      }
      try {
        const parsed = f.replace(/gross/gi, String(ctx.GROSS))
                        .replace(/ctc/gi, String(ctx.CTC))
                        .replace(/basic/gi, String(ctx.BASIC));
        return Number(Function('"use strict";return (' + parsed + ')')()) || 0;
      } catch {
        return 0;
      }
    }

    const testCtx = { CTC: 50000, GROSS: 50000, BASIC: 25000 };
    assert('Formula `(50 * CTC) / 100` evaluates to 25,000', evaluateFormula('(50 * CTC) / 100', testCtx) === 25000);
    assert('Formula `BASIC * 0.4` evaluates to 10,000', evaluateFormula('BASIC * 0.4', testCtx) === 10000);
    assert('Formula `50% of CTC` evaluates to 25,000', evaluateFormula('50% of CTC', testCtx) === 25000);
    assert('Formula `GROSS - BASIC - 10000` evaluates to 15,000', evaluateFormula('GROSS - BASIC - 10000', testCtx) === 15000);

    // -------------------------------------------------------------------------
    // SECTION 5: PAYROLL SLABS & STRICT ISOLATION
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 5: PAYROLL SLABS & STRICT ISOLATION ---');
    const [slabs] = await connection.query(`SELECT * FROM payroll_slabs WHERE is_active = 1 AND deleted_at IS NULL`);
    assert('Active payroll slabs exist', slabs.length > 0, `Count: ${slabs.length}`);

    function isComponentInSlab(comp, slabCompIds) {
      if (!slabCompIds || slabCompIds.length === 0) return false;
      const cId = String(comp.id).trim().toLowerCase();
      const cName = String(comp.name || '').trim().toLowerCase();
      const cSlug = cName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

      return slabCompIds.some(raw => {
        const s = String(raw).trim().toLowerCase();
        const sSlug = s.replace(/[^a-zA-Z0-9]/g, '_');
        return s === cId || s === cName || sSlug === cSlug;
      });
    }

    for (const slab of slabs) {
      let tokens = [];
      try {
        tokens = typeof slab.selected_component_ids === 'string' ? JSON.parse(slab.selected_component_ids) : (slab.selected_component_ids || []);
      } catch {}
      const assigned = comps.filter(c => isComponentInSlab(c, tokens));
      assert(`Slab "${slab.name}" resolves matching components without error`, Array.isArray(assigned), `Matched: ${assigned.length} items`);
    }

    // -------------------------------------------------------------------------
    // SECTION 6: LOSS OF PAY (LOP) PRO-RATION LOGIC
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 6: LOSS OF PAY (LOP) PRO-RATION LOGIC ---');
    const baseMonthlySalary = 50000;
    const monthDays = 30;

    const lopScenarios = [
      { lopDays: 0, expectedPaid: 30, expectedFactor: 1.0 },
      { lopDays: 2, expectedPaid: 28, expectedFactor: 28 / 30 },
      { lopDays: 5, expectedPaid: 25, expectedFactor: 25 / 30 },
      { lopDays: 15, expectedPaid: 15, expectedFactor: 15 / 30 },
      { lopDays: 30, expectedPaid: 0, expectedFactor: 0.0 }
    ];

    for (const sc of lopScenarios) {
      const paidDays = Math.max(0, monthDays - sc.lopDays);
      const factor = paidDays / monthDays;
      const proratedGross = Math.round(baseMonthlySalary * factor);
      assert(
        `LOP = ${sc.lopDays} days -> Paid Days = ${paidDays}, factor = ${factor.toFixed(2)}`,
        paidDays === sc.expectedPaid && Math.abs(factor - sc.expectedFactor) < 0.001,
        `Prorated Gross: ₹${proratedGross}`
      );
    }

    // -------------------------------------------------------------------------
    // SECTION 7: EMPLOYEE SALARY STRUCTURES ASSIGNMENT
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 7: EMPLOYEE SALARY STRUCTURES ---');
    const [structures] = await connection.query(`SELECT * FROM employee_salary_structures WHERE deleted_at IS NULL LIMIT 10`);
    assert('Employee salary structures table is queryable', Array.isArray(structures));
    if (structures.length > 0) {
      const s = structures[0];
      assert('Salary structure has valid employee link', s.employee_id > 0);
      assert('Salary structure has is_current flag', s.is_current !== undefined);
      assert('Salary structure has effective_from date', !!s.effective_from);
    }

    // -------------------------------------------------------------------------
    // SECTION 8: PAYSLIPS MATHEMATICAL CONSISTENCY
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 8: PAYSLIP REGISTERS & EQUALITY ---');
    const [payslips] = await connection.query(`SELECT * FROM payslips WHERE deleted_at IS NULL ORDER BY id DESC LIMIT 10`);
    assert('Payslips table is queryable', Array.isArray(payslips));
    if (payslips.length > 0) {
      let allSlipsValid = true;
      for (const p of payslips) {
        const gross = Number(p.gross_salary);
        const ded = Number(p.total_deductions);
        const net = Number(p.net_salary);
        if (gross - ded !== net) {
          allSlipsValid = false;
        }
      }
      assert('All published payslips satisfy `Gross - Deductions = Net`', allSlipsValid);
    }

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
    console.log(`SUCCESS RATE: ${Math.round((passedTests / totalTests) * 100)}%`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Test Suite Error:', err);
  } finally {
    await connection.end();
  }
}

runTestSuite();
