const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function runPayrollDbChanges() {
  console.log('ApponextHRMS - Payroll Module Database Script');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'apponexthrms'
  });
  console.log('Connected to Database:', process.env.DB_NAME || 'apponexthrms');

  console.log('\nPayroll Module Record Summary (Org #68):');
  const tables = [
    'salary_structures',
    'employee_salary_structures',
    'salary_revisions',
    'payroll_cycles',
    'payroll_runs',
    'payroll_run_employees',
    'payslips',
    'employee_loans',
    'full_final_settlements',
    'reimbursement_claims',
    'tax_declarations',
    'payroll_policies'
  ];

  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    const [rows] = await conn.execute('SELECT COUNT(*) as count FROM ' + t + ' WHERE organization_id = 68');
    console.log('  - ' + t + ': ' + rows[0].count + ' records');
  }

  console.log('\nRecent Generated Payslips:');
  const [slips] = await conn.execute('SELECT id, employee_id, payslip_number, payslip_month, basic_salary, gross_salary, total_deductions, net_salary FROM payslips WHERE organization_id = 68 ORDER BY id DESC LIMIT 5');
  console.log(slips);

  await conn.end();
}

runPayrollDbChanges().catch(function(err) { console.error(err); });
