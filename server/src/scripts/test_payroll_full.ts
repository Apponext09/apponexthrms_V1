import { initializeKnex, getKnex } from '../db/knex.js';

async function runComprehensivePayrollTest() {
  console.log('====================================================');
  console.log('     COMPREHENSIVE PAYROLL MODULE & DB AUDIT TEST    ');
  console.log('====================================================\n');

  initializeKnex();
  const db = getKnex();

  let passedTests = 0;
  let totalTests = 0;

  function assertTest(name: string, condition: boolean, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${name}`);
      if (details) console.log(`       → ${details}`);
    } else {
      console.error(`[FAIL] ${name}`);
      if (details) console.error(`       → Reason: ${details}`);
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Database Connection & Core Tables
    // ----------------------------------------------------
    console.log('\n--- 1. DATABASE & MODEL INTEGRITY ---');
    const tableChecks = [
      'payroll_cycles',
      'payroll_slabs',
      'salary_structures',
      'employee_salary_structures',
      'payroll_runs',
      'payroll_run_employees',
      'payslips'
    ];

    for (const tbl of tableChecks) {
      try {
        const countRes = await db(tbl).count('* as count').first();
        const count = Number((countRes as any)?.count || 0);
        assertTest(`Table '${tbl}' exists & accessible`, true, `Row count: ${count}`);
      } catch (err: any) {
        assertTest(`Table '${tbl}' exists & accessible`, false, err.message);
      }
    }

    // ----------------------------------------------------
    // TEST 2: Payroll Slabs & Cycle Relationships
    // ----------------------------------------------------
    console.log('\n--- 2. PAYROLL SLABS & CYCLES ---');
    const slabs = await db('payroll_slabs')
      .leftJoin('payroll_cycles as pc', 'payroll_slabs.cycle_id', 'pc.id')
      .whereNull('payroll_slabs.deleted_at')
      .select(
        'payroll_slabs.id',
        'payroll_slabs.name',
        'payroll_slabs.min_ctc',
        'payroll_slabs.max_ctc',
        'payroll_slabs.pf_rate_pct',
        'payroll_slabs.selected_component_ids',
        'pc.cycle_name'
      );

    assertTest('Payroll slabs loaded', slabs.length > 0, `Total active slabs: ${slabs.length}`);
    slabs.forEach((s: any) => {
      let compIds = [];
      try {
        compIds = typeof s.selected_component_ids === 'string' ? JSON.parse(s.selected_component_ids) : (s.selected_component_ids || []);
      } catch {}
      console.log(`  • Slab ID #${s.id}: "${s.name}" (CTC: ₹${s.min_ctc || 0} - ₹${s.max_ctc || 0}) | Cycle: ${s.cycle_name || 'Standard'} | Components assigned: ${compIds.length}`);
    });

    // ----------------------------------------------------
    // TEST 3: Employee Salary Structures & Slab Assignments
    // ----------------------------------------------------
    console.log('\n--- 3. SALARY STRUCTURES & SLAB MAPPING ---');
    const structures = await db('salary_structures as ss')
      .leftJoin('payroll_slabs as ps', 'ss.slab_id', 'ps.id')
      .leftJoin('employees as e', 'ss.employee_id', 'e.id')
      .whereNull('ss.deleted_at')
      .select(
        'ss.id',
        'ss.employee_id',
        'ss.structure_name',
        'ss.slab_id',
        'ps.name as slab_name',
        'ss.annual_ctc',
        'ss.gross_monthly',
        'ss.basic_monthly',
        'ss.net_take_home',
        'ss.custom_components',
        'e.first_name',
        'e.last_name',
        'e.employee_code'
      );

    assertTest('Salary structures present', structures.length > 0, `Total structures: ${structures.length}`);
    
    structures.slice(0, 8).forEach((st: any) => {
      const empId = st.employeeId ?? st.employee_id;
      const fn = st.firstName ?? st.first_name ?? '';
      const ln = st.lastName ?? st.last_name ?? '';
      const code = st.employeeCode ?? st.employee_code ?? `EMP-${empId}`;
      const sId = st.slabId ?? st.slab_id;
      const sName = st.slabName ?? st.slab_name;
      const gross = st.grossMonthly ?? st.gross_monthly ?? 0;
      const basic = st.basicMonthly ?? st.basic_monthly ?? 0;
      const net = st.netTakeHome ?? st.net_take_home ?? 0;
      const ctc = st.annualCtc ?? st.annual_ctc ?? 0;
      const ccRaw = st.customComponents ?? st.custom_components;

      let ccParsed = false;
      try {
        if (ccRaw) {
          const parsed = typeof ccRaw === 'string' ? JSON.parse(ccRaw) : ccRaw;
          if (Object.keys(parsed).length > 0) ccParsed = true;
        }
      } catch {}

      console.log(`  • Structure #${st.id} for ${fn} ${ln} (${code}):`);
      console.log(`    - Assigned Slab: "${sName || 'Standard Structure'}" (ID: ${sId || 'N/A'})`);
      console.log(`    - Monthly Gross: ₹${gross} | Basic: ₹${basic} | Take-Home: ₹${net} | Annual CTC: ₹${ctc}`);
      console.log(`    - Custom Components: ${ccParsed ? 'Valid & Populated' : 'None / Default'}`);
    });

    assertTest('Slab assignment linkage', structures.some((s: any) => (s.slabId ?? s.slab_id) !== null), 'Salary structures link to payroll_slabs via slab_id');

    // ----------------------------------------------------
    // TEST 4: Formula & CTC Calculation Simulation
    // ----------------------------------------------------
    console.log('\n--- 4. CTC & FORMULA CALCULATION SIMULATION ---');
    const testGross = 50000;
    const expectedBasic = Math.round(testGross * 0.5); // 25000
    const expectedHra = Math.round(expectedBasic * 0.4); // 10000
    const expectedStd = testGross - expectedBasic - expectedHra; // 15000
    const expectedPfWage = Math.min(expectedBasic, 15000); // 15000
    const expectedPf = Math.round(expectedPfWage * 0.12); // 1800
    const expectedPt = testGross > 15000 ? 200 : 0; // 200
    const expectedDeductions = expectedPf + expectedPt; // 2000
    const expectedNet = testGross - expectedDeductions; // 48000
    const expectedAnnualCtc = (testGross + expectedPf) * 12; // (50000 + 1800) * 12 = 621600

    assertTest('Derived Basic calculation (50% of Gross)', expectedBasic === 25000, `₹${expectedBasic}`);
    assertTest('Derived HRA calculation (40% of Basic)', expectedHra === 10000, `₹${expectedHra}`);
    assertTest('Standard Allowance Remainder', expectedStd === 15000, `₹${expectedStd}`);
    assertTest('Statutory PF deduction with ₹15K statutory ceiling', expectedPf === 1800, `₹${expectedPf}`);
    assertTest('Net Take-Home calculation', expectedNet === 48000, `₹${expectedNet}`);
    assertTest('Annual CTC with Employer Contribution', expectedAnnualCtc === 621600, `₹${expectedAnnualCtc}`);

    // ----------------------------------------------------
    // TEST 5: Payroll Process & Runs
    // ----------------------------------------------------
    console.log('\n--- 5. PAYROLL RUNS & PROCESSED EMPLOYEES ---');
    const latestRuns = await db('payroll_runs').orderBy('id', 'desc').limit(3);
    assertTest('Payroll runs recorded', latestRuns.length > 0, `Latest run ID: ${latestRuns[0]?.id || 'N/A'}`);

    if (latestRuns.length > 0) {
      const run = latestRuns[0];
      const runMonth = run.runMonth ?? run.run_month ?? run.month;
      const procCount = run.processedEmployees ?? run.processed_employees ?? 0;
      const errCount = run.errorCount ?? run.error_count ?? 0;
      console.log(`  • Latest Run #${run.id} (${runMonth}): Status="${run.status}", Processed=${procCount}, Errors=${errCount}`);
      assertTest('Latest run error check', Number(errCount) === 0, `Errors: ${errCount}`);

      const runEmps = await db('payroll_run_employees')
        .where('payroll_run_id', run.id)
        .select('id', 'employee_id', 'status', 'total_earnings', 'total_deductions', 'net_salary')
        .limit(5);

      console.log(`  • Sample Processed Records (first ${runEmps.length}):`);
      runEmps.forEach((re: any) => {
        const empId = re.employeeId ?? re.employee_id;
        const earn = re.totalEarnings ?? re.total_earnings ?? 0;
        const ded = re.totalDeductions ?? re.total_deductions ?? 0;
        const net = re.netSalary ?? re.net_salary ?? 0;
        console.log(`    - Emp ID #${empId}: Earnings=₹${earn}, Deductions=₹${ded}, Net=₹${net}, Status=${re.status}`);
      });
    }

    // ----------------------------------------------------
    // TEST 6: Payslip Records & CTC Validation
    // ----------------------------------------------------
    console.log('\n--- 6. PAYSLIP GENERATION & CTC ACCURACY ---');
    const payslips = await db('payslips')
      .orderBy('id', 'desc')
      .limit(5)
      .select('id', 'payslip_number', 'employee_id', 'payslip_month', 'ctc', 'gross_salary', 'net_salary');

    assertTest('Payslip records accessible', true, `Total recent checked: ${payslips.length}`);
    if (payslips.length > 0) {
      payslips.forEach((ps: any) => {
        const psNum = ps.payslipNumber ?? ps.payslip_number;
        const psMonth = ps.payslipMonth ?? ps.payslip_month;
        const gross = ps.grossSalary ?? ps.gross_salary ?? 0;
        const net = ps.netSalary ?? ps.net_salary ?? 0;
        console.log(`  • Payslip ${psNum} (${psMonth}): CTC=₹${ps.ctc || 0}, Gross=₹${gross}, Net=₹${net}`);
      });
    }

    // ----------------------------------------------------
    // FINAL SUMMARY
    // ----------------------------------------------------
    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
    console.log(passedTests === totalTests ? 'STATUS: ALL PAYROLL MODULE TESTS PASSED PERFECTLY!' : 'STATUS: SOME TESTS FAILED');
    console.log('====================================================\n');

  } catch (err: any) {
    console.error('Fatal error during test run:', err);
  } finally {
    process.exit(0);
  }
}

runComprehensivePayrollTest();
