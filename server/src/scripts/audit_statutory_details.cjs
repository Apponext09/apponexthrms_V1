const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'apponexthrms',
  }
});

async function auditStatutoryDetails() {
  console.log("================================================================================");
  console.log("                STATUTORY & BANK DETAILS DATABASE AUDIT                         ");
  console.log("================================================================================\n");

  // 1. Employee Compensation Table (Primary storage for Bank & Statutory IDs)
  try {
    const hasComp = await knex.schema.hasTable('employee_compensation');
    if (hasComp) {
      const count = await knex('employee_compensation').count('* as cnt').first();
      console.log(`1. TABLE: employee_compensation (${count.cnt} rows)`);
      const sample = await knex('employee_compensation').select(
        'id', 'employee_id', 'bank_name', 'account_number', 'ifsc_code', 'pan_number', 'pf_number', 'uan_number', 'esi_number'
      ).limit(2);
      console.log('   Sample Statutory & Bank Data:', sample);
    }
  } catch (err) {
    console.error("Error checking employee_compensation:", err.message);
  }

  console.log("\n--------------------------------------------------------------------------------\n");

  // 2. Salary Structures Table (PF, ESI, PT, TDS Statutory Deductions)
  try {
    const hasStruct = await knex.schema.hasTable('salary_structures');
    if (hasStruct) {
      const count = await knex('salary_structures').count('* as cnt').first();
      console.log(`2. TABLE: salary_structures (${count.cnt} rows)`);
      const sample = await knex('salary_structures').select(
        'id', 'employee_id', 'basic_monthly', 'gross_monthly', 'pf_deduction', 'esi_deduction', 'tds_deduction', 'net_take_home'
      ).limit(2);
      console.log('   Sample Statutory Deductions:', sample);
    }
  } catch (err) {
    console.error("Error checking salary_structures:", err.message);
  }

  console.log("\n--------------------------------------------------------------------------------\n");

  // 3. Payslips Table (Locked Snapshot of Statutory & Bank Details for PDF/Viewer)
  try {
    const hasPayslips = await knex.schema.hasTable('payslips');
    if (hasPayslips) {
      const count = await knex('payslips').count('* as cnt').first();
      console.log(`3. TABLE: payslips (${count.cnt} rows)`);
      const sample = await knex('payslips').select(
        'id', 'employee_id', 'payslip_number', 'payslip_month', 'gross_salary', 'total_deductions', 'net_salary', 'pf_no', 'uan_no', 'esic_no', 'pan', 'bank_name', 'account_no', 'ifsc_code'
      ).limit(2);
      console.log('   Sample Payslip Statutory Snapshot:', sample);
    }
  } catch (err) {
    console.error("Error checking payslips:", err.message);
  }

  await knex.destroy();
  console.log("\n================================================================================");
  console.log("                           STATUTORY AUDIT COMPLETE                             ");
  console.log("================================================================================");
}

auditStatutoryDetails().catch(err => {
  console.error("Audit failed:", err);
  process.exit(1);
});
