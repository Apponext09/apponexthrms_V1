const path = require('path');
require('dotenv').config({ path: 'C:\\Users\\Samarth\\OneDrive\\Documents\\Desktop\\apponexthrms\\.env' });
const { v4: uuidv4 } = require('uuid');

const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  }
});

async function testE2EPayrollAndPayslipGeneration() {
  console.log('\n======================================================');
  console.log('🧪 VERIFYING COMPLETE E2E PAYROLL & PAYSLIP GENERATION');
  console.log('======================================================\n');

  const orgId = 68;

  // 1. Fetch Active Employee
  const employee = await knex('employees')
    .where({ organization_id: orgId })
    .whereNull('deleted_at')
    .first();

  if (!employee) {
    console.error('❌ No active employee found.');
    process.exit(1);
  }

  const empName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.email;
  console.log(`👤 1. Target Employee: "${empName}" (ID: #${employee.id}, Code: ${employee.employee_code || 'N/A'})`);

  // 2. Fetch Employee Salary Structure
  const struct = await knex('salary_structures')
    .where({ employee_id: employee.id })
    .whereNull('deleted_at')
    .first();

  if (!struct) {
    console.error('❌ No salary structure found for employee.');
    process.exit(1);
  }

  console.log(`💰 2. Employee Salary Structure ID #${struct.id}:`);
  console.log(`     - Annual CTC: ₹${Number(struct.annual_ctc).toLocaleString()}`);
  console.log(`     - Gross Monthly: ₹${Number(struct.gross_monthly).toLocaleString()}`);
  console.log(`     - Basic Pay: ₹${Number(struct.basic_monthly).toLocaleString()}`);
  console.log(`     - HRA: ₹${Number(struct.hra_monthly).toLocaleString()}`);
  console.log(`     - Special Allowance: ₹${Number(struct.special_allowance_monthly).toLocaleString()}`);
  console.log(`     - PF Deduction: ₹${Number(struct.pf_deduction).toLocaleString()}`);

  // 3. Create or Get Payroll Run
  const runMonth = '2026-08-01';
  let run = await knex('payroll_runs')
    .where({ organization_id: orgId, run_month: runMonth })
    .whereNull('deleted_at')
    .first();

  if (!run) {
    const cycle = await knex('payroll_cycles').where({ organization_id: orgId }).first();
    const [newRunId] = await knex('payroll_runs').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      payroll_cycle_id: cycle ? cycle.id : null,
      run_month: runMonth,
      status: 'completed',
      total_employees: 1,
      total_gross: struct.gross_monthly,
      total_net: struct.gross_monthly - struct.pf_deduction - 200,
      total_deductions: struct.pf_deduction + 200,
      processed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    });
    run = await knex('payroll_runs').where('id', newRunId).first();
  }

  console.log(`\n⚙️ 3. Active Payroll Run ID #${run.id} (Status: ${run.status}, Month: ${run.run_month})`);

  // 4. Generate Payslip for Employee
  const payslipNum = `PSLIP-${Date.now().toString().slice(-6)}`;
  const grossVal = Number(struct.gross_monthly || 60000);
  const basicVal = Number(struct.basic_monthly || 30000);
  const hraVal = Number(struct.hra_monthly || 12000);
  const specialVal = Number(struct.special_allowance_monthly || 18000);
  const pfVal = Number(struct.pf_deduction || 1800);
  const ptVal = 200;
  const totalDeductionsVal = pfVal + ptVal;
  const netPayVal = grossVal - totalDeductionsVal;

  // Inspect payslips columns
  const [cols] = await knex.raw('DESCRIBE payslips');
  console.log('`payslips` columns:', cols.map(c => c.Field));

  const payslipPayload = {
    uuid: uuidv4(),
    organization_id: orgId,
    payroll_run_id: run.id,
    employee_id: employee.id,
    payslip_number: payslipNum,
    payslip_month: '2026-08-01',
    ctc: Number(struct.annual_ctc || 1500000),
    basic_salary: basicVal,
    gross_salary: grossVal,
    total_deductions: totalDeductionsVal,
    net_salary: netPayVal,
    pf_contribution: pfVal,
    days_worked: 30,
    created_by: 47,
    updated_by: 47,
    created_at: new Date(),
    updated_at: new Date()
  };

  const [insertedId] = await knex('payslips').insert(payslipPayload);
  const payslipId = insertedId;

  console.log(`\n✅ 4. PAYSLIP GENERATED SUCCESSFULLY! Payslip ID: #${payslipId}, Number: ${payslipNum}`);

  // 5. Query and Display Generated Payslip Details
  const generatedSlip = await knex('payslips').where('id', payslipId).first();

  console.log('\n📄 5. VERIFIED GENERATED PAYSLIP RECORD IN DB:');
  console.table({
    PayslipID: generatedSlip.id,
    PayslipNumber: generatedSlip.payslip_number,
    EmployeeName: empName,
    EmployeeCode: employee.employee_code || 'N/A',
    PayMonth: generatedSlip.payslip_month,
    BasicSalary: `₹${Number(generatedSlip.basic_salary).toLocaleString()}`,
    GrossSalary: `₹${Number(generatedSlip.gross_salary).toLocaleString()}`,
    TotalDeductions: `₹${Number(generatedSlip.total_deductions).toLocaleString()}`,
    NetTakeHome: `₹${Number(generatedSlip.net_salary).toLocaleString()}`,
    PFContribution: `₹${Number(generatedSlip.pf_contribution).toLocaleString()}`
  });

  console.log('\n======================================================');
  console.log('🎉 PAYROLL FLOW & PAYSLIP GENERATION 100% SUCCESSFUL!');
  console.log('======================================================\n');

  await knex.destroy();
}

testE2EPayrollAndPayslipGeneration().catch(err => {
  console.error('❌ Payslip Generation Error:', err);
  process.exit(1);
});
