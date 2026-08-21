import { v4 as uuidv4 } from 'uuid';
import { initializeKnex, getKnex } from '../db/knex.js';

async function generateDummyPayslip() {
  console.log('====================================================');
  console.log('            GENERATE DUMMY PAYSLIP SCRIPT           ');
  console.log('====================================================\n');

  initializeKnex();
  const db = getKnex();

  try {
    // 1. Pick Aarav Mehta specifically or find / create him
    let emp = await db('employees as e')
      .leftJoin('salary_structures as ss', function() {
        this.on('e.id', '=', 'ss.employee_id').andOnNull('ss.deleted_at');
      })
      .leftJoin('payroll_slabs as ps', 'ss.slab_id', 'ps.id')
      .where('e.status', 'active')
      .whereNull('e.deleted_at')
      .where(function() {
        this.whereRaw("LOWER(e.first_name) LIKE '%arav%'")
          .orWhereRaw("LOWER(e.first_name) LIKE '%aarav%'")
          .orWhereRaw("LOWER(e.last_name) LIKE '%mehta%'")
          .orWhereRaw("CONCAT(LOWER(e.first_name), ' ', LOWER(e.last_name)) LIKE '%mehta%'");
      })
      .select(
        'e.id',
        'e.organization_id',
        'e.employee_code',
        'e.first_name',
        'e.last_name',
        'e.email',
        'e.job_title',
        'ss.id as structure_id',
        'ss.slab_id',
        'ps.name as slab_name',
        'ss.gross_monthly',
        'ss.basic_monthly',
        'ss.hra_monthly',
        'ss.special_allowance_monthly',
        'ss.net_take_home',
        'ss.annual_ctc',
        'ss.custom_components'
      )
      .first();

    const firstOrg = await db('organizations').first();
    const orgId = emp?.organization_id || firstOrg?.id || 1;
    const userRow = await db('users').first();
    const validUserId = userRow?.id || 1;

    // If Aarav Mehta doesn't exist yet, find any active employee or create Aarav Mehta
    if (!emp) {
      const activeEmp = await db('employees')
        .where('status', 'active')
        .whereNull('deleted_at')
        .first();

      if (activeEmp) {
        // Update first active employee's name or create
        await db('employees').where('id', activeEmp.id).update({
          first_name: 'Aarav',
          last_name: 'Mehta',
          job_title: 'Software Engineer',
        });
        emp = await db('employees as e')
          .leftJoin('salary_structures as ss', function() {
            this.on('e.id', '=', 'ss.employee_id').andOnNull('ss.deleted_at');
          })
          .leftJoin('payroll_slabs as ps', 'ss.slab_id', 'ps.id')
          .where('e.id', activeEmp.id)
          .select(
            'e.id',
            'e.organization_id',
            'e.employee_code',
            'e.first_name',
            'e.last_name',
            'e.email',
            'e.job_title',
            'ss.id as structure_id',
            'ss.slab_id',
            'ps.name as slab_name',
            'ss.gross_monthly',
            'ss.basic_monthly',
            'ss.hra_monthly',
            'ss.special_allowance_monthly',
            'ss.net_take_home',
            'ss.annual_ctc',
            'ss.custom_components'
          )
          .first();
      }
    }

    const empId = emp.id;
    const empName = `${emp.first_name || 'Aarav'} ${emp.last_name || 'Mehta'}`.trim();
    const empCode = emp.employee_code || `EMP-${empId}`;

    // Get assigned slab
    let slabId = emp.slab_id;
    let slabName = emp.slab_name;
    if (!slabId) {
      const defaultSlab = await db('payroll_slabs').whereNull('deleted_at').first();
      slabId = defaultSlab?.id || 1;
      slabName = defaultSlab?.name || 'Junior / Software Engineer Salary Slab';
    }

    console.log(`• Target Employee: ${empName} (${empCode}) [ID: ${empId}]`);
    console.log(`• Assigned Pay Slab: "${slabName}" [Slab ID: ${slabId}]`);

    // 2. Fetch or create a Payroll Run for August 2026 (Month: 2026-08)
    const runMonthStr = '2026-08-01';
    let run = await db('payroll_runs')
      .where('organization_id', orgId)
      .whereRaw("DATE_FORMAT(run_month, '%Y-%m') = '2026-08'")
      .first();

    if (!run) {
      const cycle = await db('payroll_cycles').first();
      const cycleId = cycle?.id || 1;

      const [newRunId] = await db('payroll_runs').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        payroll_cycle_id: cycleId,
        run_type: 'regular',
        run_month: runMonthStr,
        status: 'published',
        processed_employees: 1,
        total_employees: 1,
        error_count: 0,
        created_by: validUserId,
        updated_by: validUserId
      });
      run = await db('payroll_runs').where('id', newRunId).first();
      console.log(`• Created new Payroll Run for August 2026 (Run ID: ${newRunId})`);
    } else {
      console.log(`• Using existing Payroll Run for August 2026 (Run ID: ${run.id})`);
    }

    const runId = run.id;

    // 3. Compute salary figures
    const grossMonthly = Number(emp.gross_monthly) || 50000;
    const basicMonthly = Number(emp.basic_monthly) || Math.round(grossMonthly * 0.5);
    const hraMonthly = Number(emp.hra_monthly) || Math.round(basicMonthly * 0.4);
    const stdAllowance = Math.max(0, grossMonthly - basicMonthly - hraMonthly);
    const pfDeduction = Math.min(1800, Math.round(basicMonthly * 0.12));
    const ptDeduction = grossMonthly > 15000 ? 200 : 0;
    const totalDeductions = pfDeduction + ptDeduction;
    const netSalary = grossMonthly - totalDeductions;
    const pfEmployer = pfDeduction;
    const annualCtc = (grossMonthly + pfEmployer) * 12;

    const payslipNumber = `PS-202608-${empCode.replace(/[^a-zA-Z0-9]/g, '')}`;

    // Ensure structure exists
    if (!emp.structure_id) {
      await db('salary_structures').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        employee_id: empId,
        structure_name: slabName,
        structure_code: `STR-${empCode}`,
        slab_id: slabId,
        gross_monthly: grossMonthly,
        basic_monthly: basicMonthly,
        hra_monthly: hraMonthly,
        special_allowance_monthly: stdAllowance,
        net_take_home: netSalary,
        annual_ctc: annualCtc,
        status: 'active',
        effective_from: '2026-08-01',
        created_by: validUserId,
        updated_by: validUserId
      }).catch(() => {});
    }

    // 4. Ensure payroll_run_employees record exists
    let runEmp = await db('payroll_run_employees')
      .where({ payroll_run_id: runId, employee_id: empId })
      .first();

    if (!runEmp) {
      const [reId] = await db('payroll_run_employees').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        payroll_run_id: runId,
        employee_id: empId,
        status: 'processed',
        total_earnings: grossMonthly,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        created_by: validUserId,
        updated_by: validUserId,
        created_at: new Date(),
        updated_at: new Date()
      });
      runEmp = await db('payroll_run_employees').where('id', reId).first();
    }

    // 5. Delete existing dummy payslip if any to replace with fresh generated one
    await db('payslips')
      .where({ organization_id: orgId, payslip_number: payslipNumber })
      .del()
      .catch(() => {});

    // 6. Insert new Payslip
    const [payslipId] = await db('payslips').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      employee_id: empId,
      payroll_run_id: runId,
      payslip_month: runMonthStr,
      payslip_number: payslipNumber,
      ctc: annualCtc,
      basic_salary: basicMonthly,
      gross_salary: grossMonthly,
      total_deductions: totalDeductions,
      net_salary: netSalary,
      ytd_gross: grossMonthly * 5, // 5 months into FY
      ytd_tax: 0,
      ytd_net: netSalary * 5,
      is_locked: false,
      digitally_signed: true,
      signature_timestamp: new Date(),
      created_by: validUserId,
      updated_by: validUserId,
      created_at: new Date(),
      updated_at: new Date()
    });

    const generatedPayslip = await db('payslips').where('id', payslipId).first();

    // 7. Output formatted dummy payslip
    console.log('\n====================================================');
    console.log('             DUMMY PAYSLIP GENERATED                ');
    console.log('====================================================');
    console.log(`Payslip Number   : ${generatedPayslip.payslip_number || generatedPayslip.payslipNumber}`);
    console.log(`Employee Name    : ${empName}`);
    console.log(`Employee Code    : ${empCode}`);
    console.log(`Designation      : ${emp.job_title || 'Software Engineer'}`);
    console.log(`Pay Slab Mapped  : ${slabName}`);
    console.log(`Month / Period   : August 2026 (2026-08)`);
    console.log(`Payroll Run ID   : #${runId}`);
    console.log('----------------------------------------------------');
    console.log('EARNINGS BREAKDOWN:');
    console.log(`  • Basic Salary               : ₹${basicMonthly.toLocaleString('en-IN')}`);
    console.log(`  • House Rent Allowance (HRA) : ₹${hraMonthly.toLocaleString('en-IN')}`);
    console.log(`  • Standard / Special Allow.  : ₹${stdAllowance.toLocaleString('en-IN')}`);
    console.log(`  --------------------------------------------------`);
    console.log(`  ► GROSS EARNINGS             : ₹${grossMonthly.toLocaleString('en-IN')}`);
    console.log('----------------------------------------------------');
    console.log('DEDUCTIONS BREAKDOWN:');
    console.log(`  • Provident Fund (Employee)  : ₹${pfDeduction.toLocaleString('en-IN')}`);
    console.log(`  • Professional Tax (PT)      : ₹${ptDeduction.toLocaleString('en-IN')}`);
    console.log(`  --------------------------------------------------`);
    console.log(`  ► TOTAL DEDUCTIONS           : ₹${totalDeductions.toLocaleString('en-IN')}`);
    console.log('----------------------------------------------------');
    console.log(`► NET TAKE-HOME SALARY         : ₹${netSalary.toLocaleString('en-IN')}`);
    console.log(`► ANNUAL CTC (with PF Match)   : ₹${annualCtc.toLocaleString('en-IN')}`);
    console.log(`► YTD GROSS EARNINGS           : ₹${Number(generatedPayslip.ytd_gross || generatedPayslip.ytdGross || 0).toLocaleString('en-IN')}`);
    console.log(`► YTD NET SALARY               : ₹${Number(generatedPayslip.ytd_net || generatedPayslip.ytdNet || 0).toLocaleString('en-IN')}`);
    console.log('====================================================\n');
    console.log(`SUCCESS: Dummy payslip successfully generated and stored in database table 'payslips' (ID: ${payslipId})!`);

  } catch (err: any) {
    console.error('Error generating dummy payslip:', err);
  } finally {
    process.exit(0);
  }
}

generateDummyPayslip();
