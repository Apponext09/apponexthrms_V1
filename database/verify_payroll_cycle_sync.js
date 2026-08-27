const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'health',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  console.log('=== 1. Active Payroll Cycles ===');
  const [cycles] = await conn.query('SELECT id, cycle_name, cycle_code, frequency, total_days_calc, cutoff_day, status, is_current_cycle FROM payroll_cycles WHERE deleted_at IS NULL');
  console.table(cycles);

  console.log('=== 2. Processed Payroll Runs & Totals ===');
  const [runs] = await conn.query('SELECT id, organization_id, payroll_cycle_id, run_type, run_month, status, total_employees, processed_employees FROM payroll_runs WHERE deleted_at IS NULL ORDER BY id DESC LIMIT 5');
  console.table(runs);

  console.log('=== 3. Employee Payroll Run Computations vs Salary Structure ===');
  const [runEmps] = await conn.query(`
    SELECT 
      e.id as emp_id,
      CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) as emp_name,
      e.employee_code,
      COALESCE(ss.gross_monthly, 'N/A') as struct_gross,
      COALESCE(ss.basic_monthly, 'N/A') as struct_basic,
      COALESCE(ss.net_take_home, 'N/A') as struct_net,
      pre.total_earnings as processed_earnings,
      pre.total_deductions as processed_deductions,
      pre.net_salary as processed_net,
      pre.status as run_status
    FROM employees e
    LEFT JOIN salary_structures ss ON ss.employee_id = e.id AND ss.deleted_at IS NULL
    LEFT JOIN payroll_run_employees pre ON pre.employee_id = e.id AND pre.deleted_at IS NULL
    WHERE e.id IN (49, 50, 47, 69)
    ORDER BY pre.id DESC
  `);
  console.table(runEmps);

  await conn.end();
}

check().catch(console.error);
