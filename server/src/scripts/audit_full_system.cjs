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

async function auditSystem() {
  console.log("================================================");
  console.log("       OVERALL SYSTEM & DUPLICATE AUDIT         ");
  console.log("================================================\n");

  const tablesToAudit = [
    'payroll_cycles',
    'payroll_slabs',
    'payroll_component_groups',
    'salary_structures',
    'employee_salary_structures',
    'salary_components',
    'payslips',
    'payroll_runs',
    'payroll_run_employees',
    'loans',
    'loan_types',
    'loan_repayments',
    'expense_claims',
    'travel_requests'
  ];

  for (const tableName of tablesToAudit) {
    try {
      const hasTable = await knex.schema.hasTable(tableName);
      if (!hasTable) {
        console.log(`[NOT FOUND] Table '${tableName}' does not exist.`);
        continue;
      }

      const totalCount = await knex(tableName).count('* as cnt').first();
      const count = totalCount ? totalCount.cnt : 0;
      console.log(`--- TABLE: ${tableName} ---`);
      console.log(`Total Rows: ${count}`);

      if (count > 0) {
        const sample = await knex(tableName).select('*').limit(1);
        console.log('Sample Row:', sample[0]);

        // Check for duplicates by name or code or (employee_id + month) if applicable
        if (tableName === 'payroll_slabs' || tableName === 'payroll_component_groups') {
          const dupes = await knex(tableName)
            .select('name')
            .whereNull('deleted_at')
            .groupBy('name')
            .havingRaw('COUNT(*) > 1');
          if (dupes.length > 0) {
            console.log(`⚠️ WARNING: Duplicate active names found in ${tableName}:`, dupes);
          } else {
            console.log(`✅ No active duplicate names found in ${tableName}.`);
          }
        } else if (tableName === 'payslips') {
          const dupes = await knex(tableName)
            .select('employee_id', 'payslip_month')
            .whereNull('deleted_at')
            .groupBy('employee_id', 'payslip_month')
            .havingRaw('COUNT(*) > 1');
          if (dupes.length > 0) {
            console.log(`⚠️ WARNING: Duplicate active payslips found in ${tableName}:`, dupes);
          } else {
            console.log(`✅ No duplicate payslips per employee/month in ${tableName}.`);
          }
        }
      }
      console.log('\n');
    } catch (err) {
      console.error(`Error checking table '${tableName}':`, err.message);
    }
  }

  await knex.destroy();
  console.log("================================================");
  console.log("               AUDIT COMPLETE                   ");
  console.log("================================================");
}

auditSystem().catch(err => {
  console.error("Audit script failed:", err);
  process.exit(1);
});
