const mysql = require('mysql2/promise');
async function main() {
  const conn = await mysql.createConnection({
    host:'localhost', port:3306, user:'root', password:'root123', database:'health'
  });

  // Check salary_structures columns first
  const [cols] = await conn.query('DESCRIBE salary_structures');
  console.log('salary_structures columns:', cols.map(function(c){ return c.Field; }).join(', '));

  // Find Aarav Shah (id=115) and Aarav Sharma (id=34)
  const empIds = [115, 34];

  for (const empId of empIds) {
    const [emp] = await conn.query(
      'SELECT id, first_name, last_name, employee_code FROM employees WHERE id = ?', [empId]
    );
    if (!emp.length) continue;
    const e = emp[0];
    console.log('\n=== Employee: ' + e.first_name + ' ' + e.last_name + ' (id=' + e.id + ', code=' + e.employee_code + ')');

    const [ss] = await conn.query(
      'SELECT * FROM salary_structures WHERE employee_id = ? ORDER BY effective_from DESC LIMIT 3',
      [empId]
    );
    console.log('  Salary Structures:', JSON.stringify(ss, null, 2));

    const [slips] = await conn.query(
      'SELECT id, payroll_month, gross_salary, net_salary, total_deductions FROM payslips WHERE employee_id = ? ORDER BY created_at DESC LIMIT 2',
      [empId]
    );
    console.log('  Payslips:', JSON.stringify(slips, null, 2));
  }

  await conn.end();
}
main().catch(function(e){ console.error(e.message); });
