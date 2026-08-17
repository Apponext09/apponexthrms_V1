const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from server root or project root
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

async function inspectAllModules() {
  console.log("================================================================================");
  console.log("       TODAY EXPENSE, LOAN, TRAVEL & PAYROLL DATABASE AUDIT SCRIPT             ");
  console.log("================================================================================\n");

  const tablesToAudit = [
    // Payroll Tables
    'payroll_cycles',
    'payroll_slabs',
    'payroll_component_groups',
    'salary_structures',
    'employee_salary_structures',
    'salary_components',
    'payslips',
    'payroll_runs',
    'payroll_run_employees',
    'full_final_settlements',
    
    // Loan Tables
    'loan_types',
    'employee_loans',
    'loans',
    'loan_repayments',
    'salary_advances',

    // Expense Tables
    'expense_claims',
    'expenses',
    'expense_categories',
    'reimbursements',

    // Travel Tables
    'travel_requests',
    'travel_bookings',
    'travel_expenses'
  ];

  for (const tableName of tablesToAudit) {
    try {
      const hasTable = await knex.schema.hasTable(tableName);
      if (!hasTable) {
        console.log(`[NOT FOUND] Table '${tableName}' does not exist in database.\n`);
        continue;
      }

      const totalCount = await knex(tableName).count('* as cnt').first();
      const count = totalCount ? totalCount.cnt : 0;
      console.log(`--- TABLE: ${tableName} ---`);
      console.log(`Total Rows: ${count}`);

      if (count > 0) {
        const sample = await knex(tableName).select('*').limit(2);
        console.log('Sample Data (First 2 rows):', sample);
      } else {
        console.log('(Table is empty)');
      }
      console.log('\n');
    } catch (err) {
      console.error(`Error inspecting table '${tableName}':`, err.message);
    }
  }

  await knex.destroy();
  console.log("================================================================================");
  console.log("                           INSPECTION COMPLETE                                  ");
  console.log("================================================================================");
}

inspectAllModules().catch(err => {
  console.error("Script execution failed:", err);
  process.exit(1);
});
