import mysql from 'mysql2/promise';
const conn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'ROOT', database: 'hrms' });
const [rows] = await conn.execute("SELECT pr.id as runId, DATE_FORMAT(pr.run_month, '%Y-%m') as runMonthFmt, pr.run_month as raw, pre.status FROM payroll_run_employees pre JOIN payroll_runs pr ON pre.payroll_run_id = pr.id WHERE pre.employee_id = 179 ORDER BY pre.id DESC LIMIT 5");
console.log(JSON.stringify(rows, null, 1));
await conn.end();
