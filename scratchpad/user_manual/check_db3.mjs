import mysql from 'mysql2/promise';
const conn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'ROOT', database: 'hrms' });

const [pre] = await conn.execute("SELECT * FROM payroll_run_employees WHERE id = 340");
console.log('PAYROLL_RUN_EMPLOYEES row 340:', JSON.stringify(pre, null, 1));

const [earn] = await conn.execute("SELECT payroll_run_employee_id, component_id, calculated_value, actual_value FROM payroll_earnings WHERE payroll_run_employee_id = 340");
console.log('EARNINGS for 340:', JSON.stringify(earn, null, 1));

const [ded] = await conn.execute("SELECT payroll_run_employee_id, component_id, calculated_value, actual_value FROM payroll_deductions WHERE payroll_run_employee_id = 340");
console.log('DEDUCTIONS for 340:', JSON.stringify(ded, null, 1));

await conn.end();
