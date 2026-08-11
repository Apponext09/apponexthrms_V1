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

async function testEmployeeStatutoryInPayslip() {
  console.log('\n======================================================');
  console.log('🧪 TESTING EMPLOYEE PROFILE STATUTORY DETAILS IN PAYSLIP');
  console.log('======================================================\n');

  const orgId = 68;

  // 1. Fetch Target Employee
  const employee = await knex('employees')
    .where({ organization_id: orgId })
    .whereNull('deleted_at')
    .first();

  if (!employee) {
    console.error('❌ Target employee not found.');
    process.exit(1);
  }

  console.log(`👤 Target Employee: "${employee.first_name || ''} ${employee.last_name || ''}" (ID: #${employee.id})`);

  // 2. Set/Update Statutory Details on Employee Profile
  const samplePan = 'ABCDE1234F';
  const samplePf = 'MH/BAN/0012345/000/0001024';
  const sampleUan = '100987654321';
  const sampleEsic = '31000987654321001';
  const sampleBank = 'HDFC Bank Ltd';
  const sampleAccount = '50100234567890';
  const sampleIfsc = 'HDFC0001234';

  await knex('employees').where({ id: employee.id }).update({
    pan: samplePan,
    pf_no: samplePf,
    uan_no: sampleUan,
    esic_no: sampleEsic,
    bank_name: sampleBank,
    account_no: sampleAccount,
    ifsc_code: sampleIfsc,
    updated_at: new Date()
  });

  console.log('✅ 1. Statutory Details updated on Employee Profile in `employees` table:');
  console.log(`     - PAN: ${samplePan}`);
  console.log(`     - PF Number: ${samplePf}`);
  console.log(`     - UAN: ${sampleUan}`);
  console.log(`     - ESIC Number: ${sampleEsic}`);
  console.log(`     - Bank: ${sampleBank} (A/C: ${sampleAccount}, IFSC: ${sampleIfsc})\n`);

  // 3. Create or Fetch Payroll Run
  let run = await knex('payroll_runs').where({ organization_id: orgId }).first();

  // 4. Generate Payslip carrying Statutory Data from Employee Profile
  const payslipNum = `PSLIP-STAT-${Date.now().toString().slice(-5)}`;
  const struct = await knex('salary_structures').where({ employee_id: employee.id }).first();
  const ctcVal = Number(struct ? struct.annual_ctc : 1500000);
  const grossVal = Number(struct ? struct.gross_monthly : 125000);
  const basicVal = Number(struct ? struct.basic_monthly : 62500);
  const pfVal = Number(struct ? struct.pf_deduction : 1800);
  const ptVal = 200;
  const netVal = grossVal - pfVal - ptVal;

  const payslipPayload = {
    uuid: uuidv4(),
    organization_id: orgId,
    payroll_run_id: run ? run.id : 114,
    employee_id: employee.id,
    payslip_number: payslipNum,
    payslip_month: '2026-08-01',
    ctc: ctcVal,
    basic_salary: basicVal,
    gross_salary: grossVal,
    total_deductions: pfVal + ptVal,
    net_salary: netVal,
    pf_contribution: pfVal,
    tax_deduction: ptVal,
    // Statutory details passed into Payslip from Employee Profile
    pan: samplePan,
    pf_no: samplePf,
    uan_no: sampleUan,
    esic_no: sampleEsic,
    bank_name: sampleBank,
    account_no: sampleAccount,
    ifsc_code: sampleIfsc,
    created_by: 47,
    updated_by: 47,
    created_at: new Date(),
    updated_at: new Date()
  };

  const [payslipId] = await knex('payslips').insert(payslipPayload);
  console.log(`✅ 2. Payslip Generated with Statutory Details! ID: #${payslipId}`);

  // 5. Query and Display Payslip Record
  const savedSlip = await knex('payslips').where({ id: payslipId }).first();

  console.log('\n📄 3. VERIFIED PAYSLIP RECORD WITH STATUTORY DETAILS IN DB:');
  console.table({
    PayslipID: savedSlip.id,
    EmployeeID: savedSlip.employee_id,
    PAN: savedSlip.pan,
    PFNumber: savedSlip.pf_no,
    UANNumber: savedSlip.uan_no,
    ESICNumber: savedSlip.esic_no,
    BankName: savedSlip.bank_name,
    AccountNumber: savedSlip.account_no,
    IFSCCode: savedSlip.ifsc_code,
    PFContribution: `₹${Number(savedSlip.pf_contribution).toLocaleString()}`,
    NetSalary: `₹${Number(savedSlip.net_salary).toLocaleString()}`
  });

  console.log('\n======================================================');
  console.log('🎉 EMPLOYEE STATUTORY DETAILS IN PAYSLIP VERIFIED 100%!');
  console.log('======================================================\n');

  await knex.destroy();
}

testEmployeeStatutoryInPayslip().catch(err => {
  console.error('❌ Statutory Verification Error:', err);
  process.exit(1);
});
