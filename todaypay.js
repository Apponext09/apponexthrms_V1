const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, 'server/.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

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

async function inspectAllModules() {
  console.log("==========================================================================================");
  console.log("       ALL-IN-ONE HRMS DATABASE AUDIT: PAYROLL, STATUTORY, LOANS, EXPENSES & TRAVEL       ");
  console.log("==========================================================================================\n");

  const tablesToAudit = [
    // 1. Payroll Tables
    { name: 'payroll_cycles', label: 'Payroll Cycles' },
    { name: 'payroll_slabs', label: 'Payroll Pay Slabs' },
    { name: 'payroll_component_groups', label: 'Component Groups' },
    { name: 'salary_structures', label: 'Salary Structures' },
    { name: 'employee_salary_structures', label: 'Employee Salary Mappings' },
    { name: 'salary_components', label: 'Salary Component Definitions' },
    { name: 'payslips', label: 'Generated Payslips' },
    { name: 'payroll_runs', label: 'Payroll Runs' },
    { name: 'payroll_run_employees', label: 'Payroll Run Employees' },
    { name: 'full_final_settlements', label: 'F&F Settlements' },

    // 2. Statutory & Bank Details Storage
    { name: 'employees', label: 'Employees (Statutory & Bank IDs)' },
    { name: 'employee_compensation', label: 'Employee Compensation & Bank Details' },

    // 3. Loan Tables
    { name: 'loan_types', label: 'Loan Categories / Types' },
    { name: 'employee_loans', label: 'Employee Active Loans' },
    { name: 'loan_repayments', label: 'Loan Repayments / EMI Schedule' },
    { name: 'salary_advances', label: 'Salary Advances' },

    // 4. Expense Tables
    { name: 'expense_claims', label: 'Expense Reimbursement Claims' },
    { name: 'expenses', label: 'Expenses' },
    { name: 'expense_categories', label: 'Expense Categories' },
    { name: 'reimbursements', label: 'Reimbursement Claims' },

    // 5. Travel Tables
    { name: 'travel_requests', label: 'Travel Requests' },
    { name: 'travel_bookings', label: 'Travel Bookings' },
    { name: 'travel_expenses', label: 'Travel Expenses' }
  ];

  for (const item of tablesToAudit) {
    const tableName = item.name;
    try {
      const hasTable = await knex.schema.hasTable(tableName);
      if (!hasTable) {
        console.log(`[NOT FOUND] Table '${tableName}' (${item.label}) does not exist in database.\n`);
        continue;
      }

      const totalCount = await knex(tableName).count('* as cnt').first();
      const count = totalCount ? totalCount.cnt : 0;
      console.log(`--- TABLE: ${tableName} (${item.label}) ---`);
      console.log(`Total Rows: ${count}`);

      if (count > 0) {
        let selectCols = '*';
        if (tableName === 'employees') {
          selectCols = ['id', 'first_name', 'last_name', 'employee_code', 'pan', 'pf_no', 'uan_no', 'esic_no', 'bank_name', 'account_no', 'ifsc_code'];
        } else if (tableName === 'employee_compensation') {
          selectCols = ['id', 'employee_id', 'bank_name', 'account_number', 'ifsc_code', 'uan_number', 'esic_number'];
        }
        const sample = await knex(tableName).select(selectCols).limit(2);
        console.log('Sample Records:', sample);
      } else {
        console.log('(Table is empty)');
      }
      console.log('\n');
    } catch (err) {
      console.error(`Error inspecting table '${tableName}':`, err.message);
    }
  }

  await knex.destroy();
  console.log("==========================================================================================");
  console.log("                                INSPECTION COMPLETE                                       ");
  console.log("==========================================================================================");
}

inspectAllModules().catch(err => {
  console.error("Script execution failed:", err);
  process.exit(1);
});
