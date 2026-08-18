import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: 'localhost', port: 3306, user: 'root', password: 'ROOT', database: 'hrms'
});

const [runs] = await conn.execute("SELECT id, run_month, status FROM payroll_runs WHERE id IN (27,30)");
console.log('RUNS:', JSON.stringify(runs, null, 1));

const [pre] = await conn.execute("SELECT id, payroll_run_id, employee_id, status, net_salary FROM payroll_run_employees WHERE employee_id = 179 ORDER BY id DESC LIMIT 5");
console.log('RUN_EMPLOYEES for emp 179:', JSON.stringify(pre, null, 1));

await conn.end();
