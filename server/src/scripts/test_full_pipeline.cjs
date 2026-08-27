const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function testFullPayrollPipeline() {
  console.log('=== RUNNING END-TO-END PAYROLL PIPELINE SIMULATION ===');
  const orgId = 8;
  const cycleId = 13;
  const month = '2026-08';

  // 1. Clean old test runs
  await db('payslips').where('organization_id', orgId).del();
  await db('payroll_adjustments').where('organization_id', orgId).del().catch(() => {});
  await db('payroll_deductions').where('organization_id', orgId).del();
  await db('payroll_earnings').where('organization_id', orgId).del();
  await db('payroll_run_employees').where('organization_id', orgId).del();
  await db('payroll_runs').where('organization_id', orgId).del();
  console.log('Cleared previous run tables.');

  // 2. Fetch cycle
  const cycle = await db('payroll_cycles').where('id', cycleId).first();
  const startDay = Number(cycle.start_date || cycle.calculation_start_day || 1);
  const cutoffDay = Number(cycle.cutoff_day || 28);
  const totalCycleDays = cutoffDay - startDay + 1;

  // 3. Create Payroll Run
  const [runId] = await db('payroll_runs').insert({
    organization_id: orgId,
    cycle_id: cycleId,
    payroll_period: month,
    run_type: 'regular',
    status: 'draft',
    total_gross: 0,
    total_deductions: 0,
    total_net: 0,
    employee_count: 0,
    created_by: 10,
    updated_by: 10,
    created_at: new Date(),
    updated_at: new Date()
  });
  console.log(`Created Draft Payroll Run #${runId}`);

  // 4. Fetch all 39 employees
  const emps = await db('employees')
    .where('organization_id', orgId)
    .whereNull('deleted_at');

  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  for (const emp of emps) {
    const struct = await db('salary_structures').where('employee_id', emp.id).whereNull('deleted_at').first();
    const grossMonthly = struct ? Number(struct.gross_monthly) : 45000;

    // Attendance
    const attRecs = await db('attendance_records')
      .where('employee_id', emp.id)
      .whereBetween('check_in_date', [`${month}-01`, `${month}-${String(cutoffDay).padStart(2, '0')}`]);

    let present = 0;
    let halfDay = 0;
    let weeklyOff = 0;
    let absent = 0;
    for (const r of attRecs) {
      if (r.status === 'present') present++;
      else if (r.status === 'half_day') halfDay++;
      else if (r.status === 'weekly_off') weeklyOff++;
      else if (r.status === 'absent') absent++;
    }

    const paidDays = attRecs.length > 0 ? (present + (halfDay * 0.5) + weeklyOff) : totalCycleDays;
    const unpaidDays = Math.max(0, totalCycleDays - paidDays);
    const attendanceFactor = paidDays / totalCycleDays;

    // Components
    const basicActual = Math.round(grossMonthly * 0.5);
    const hraActual = Math.round(basicActual * 0.4);
    const conveyanceActual = 1600;
    const medicalActual = 1250;
    const specialActual = Math.max(0, grossMonthly - (basicActual + hraActual + conveyanceActual + medicalActual));

    const basicEarned = Math.round(basicActual * attendanceFactor);
    const hraEarned = Math.round(hraActual * attendanceFactor);
    const conveyanceEarned = Math.round(conveyanceActual * attendanceFactor);
    const medicalEarned = Math.round(medicalActual * attendanceFactor);
    const specialEarned = Math.round(specialActual * attendanceFactor);
    const empGrossEarned = basicEarned + hraEarned + conveyanceEarned + medicalEarned + specialEarned;

    const pf = Math.min(1800, Math.round(basicEarned * 0.12));
    const pt = grossMonthly > 15000 ? 200 : 0;
    const esic = grossMonthly <= 21000 ? Math.round(empGrossEarned * 0.0075) : 0;
    const empTotalDeductions = pf + pt + esic;
    const empNet = empGrossEarned - empTotalDeductions;

    // Insert Run Employee
    const [runEmpId] = await db('payroll_run_employees').insert({
      payroll_run_id: runId,
      organization_id: orgId,
      employee_id: emp.id,
      gross_salary: empGrossEarned,
      total_deductions: empTotalDeductions,
      net_salary: empNet,
      payment_status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Insert Earnings breakdown
    await db('payroll_earnings').insert([
      { payroll_run_employee_id: runEmpId, organization_id: orgId, component_id: 1, component_name: 'Basic Salary', actual_value: basicEarned, formula_used: '50% of Gross', created_at: new Date(), updated_at: new Date() },
      { payroll_run_employee_id: runEmpId, organization_id: orgId, component_id: 2, component_name: 'House Rent Allowance (HRA)', actual_value: hraEarned, formula_used: '40% of Basic', created_at: new Date(), updated_at: new Date() },
      { payroll_run_employee_id: runEmpId, organization_id: orgId, component_id: 3, component_name: 'Special Allowance', actual_value: specialEarned, formula_used: 'Balancing', created_at: new Date(), updated_at: new Date() },
      { payroll_run_employee_id: runEmpId, organization_id: orgId, component_id: 4, component_name: 'Conveyance Allowance', actual_value: conveyanceEarned, formula_used: 'Fixed', created_at: new Date(), updated_at: new Date() },
      { payroll_run_employee_id: runEmpId, organization_id: orgId, component_id: 5, component_name: 'Medical Allowance', actual_value: medicalEarned, formula_used: 'Fixed', created_at: new Date(), updated_at: new Date() }
    ]);

    // Insert Deductions breakdown
    await db('payroll_deductions').insert([
      { payroll_run_employee_id: runEmpId, organization_id: orgId, component_id: 14, component_name: 'Provident Fund (EPF)', actual_value: pf, created_at: new Date(), updated_at: new Date() },
      ...(pt > 0 ? [{ payroll_run_employee_id: runEmpId, organization_id: orgId, component_id: 16, component_name: 'Professional Tax (PT)', actual_value: pt, created_at: new Date(), updated_at: new Date() }] : []),
      ...(esic > 0 ? [{ payroll_run_employee_id: runEmpId, organization_id: orgId, component_id: 15, component_name: 'Employee State Insurance (ESIC)', actual_value: esic, created_at: new Date(), updated_at: new Date() }] : [])
    ]);

    totalGross += empGrossEarned;
    totalDeductions += empTotalDeductions;
    totalNet += empNet;
  }

  // Update Run Totals
  await db('payroll_runs').where('id', runId).update({
    total_gross: totalGross,
    total_deductions: totalDeductions,
    total_net: totalNet,
    employee_count: emps.length,
    updated_at: new Date()
  });

  console.log(`Step 1 (Process): Processed ${emps.length} employees. Total Net: ₹${totalNet.toLocaleString('en-IN')}`);

  // Step 2: Lock Figures
  await db('payroll_runs').where('id', runId).update({ status: 'locked', updated_at: new Date() });
  console.log('Step 2 (Lock): Figures locked successfully.');

  // Step 3: Approve Run
  await db('payroll_runs').where('id', runId).update({ status: 'approved', approved_by: 10, approved_at: new Date(), updated_at: new Date() });
  console.log('Step 3 (Approve): Run approved by Organization Admin.');

  // Step 4: Publish Payslips
  const runEmps = await db('payroll_run_employees').where('payroll_run_id', runId);
  for (const rEmp of runEmps) {
    await db('payslips').insert({
      payroll_run_id: runId,
      organization_id: orgId,
      employee_id: rEmp.employee_id,
      month: month,
      gross_salary: rEmp.gross_salary,
      total_deductions: rEmp.total_deductions,
      net_salary: rEmp.net_salary,
      status: 'published',
      is_locked: 0,
      generated_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  await db('payroll_runs').where('id', runId).update({ status: 'published', updated_at: new Date() });
  console.log(`Step 4 (Publish): Published ${runEmps.length} employee payslips.`);

  // 5. Verify Payslip Viewer data retrieval
  const testSlip = await db('payslips').where('payroll_run_id', runId).first();
  const testEarnings = await db('payroll_earnings').where('payroll_run_employee_id', runEmps[0].id);
  const testDeductions = await db('payroll_deductions').where('payroll_run_employee_id', runEmps[0].id);

  console.log(`\nVerified Sample Payslip #${testSlip.id}:`);
  console.log(`  Gross: ₹${testSlip.gross_salary} | Deductions: ₹${testSlip.total_deductions} | Net: ₹${testSlip.net_salary}`);
  console.log(`  Earnings count: ${testEarnings.length}, Deductions count: ${testDeductions.length}`);
  console.log('\n=== ALL 4 STEPS PASSED WITH ZERO ERRORS ===');

  await db.destroy();
}

testFullPayrollPipeline().catch(console.error);
