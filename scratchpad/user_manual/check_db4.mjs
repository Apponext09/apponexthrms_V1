import mysql from 'mysql2/promise';
const conn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'ROOT', database: 'hrms' });
const [rows] = await conn.execute("SELECT id, employee_id, payslip_number, payslip_month, DATE_FORMAT(payslip_month,'%Y-%m') as fmt, ctc, net_salary, is_locked, deleted_at FROM payslips WHERE id = 253");
console.log(JSON.stringify(rows, null, 1));
const [all] = await conn.execute("SELECT id, employee_id, payslip_number, DATE_FORMAT(payslip_month,'%Y-%m') as fmt FROM payslips WHERE employee_id = 179");
console.log('ALL for emp179:', JSON.stringify(all, null, 1));
await conn.end();
