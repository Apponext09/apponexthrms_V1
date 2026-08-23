const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function verify() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'apponexthrms',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  console.log('=== 1. COMPANY ARHAM ===');
  const [comp] = await conn.query('SELECT company_id, name, code, city, state, country, status FROM company WHERE name = ?', ['Arham']);
  console.table(comp);

  const companyId = comp[0].company_id;

  console.log('=== 2. LOCATION AHILYANAGAR ===');
  const [loc] = await conn.query('SELECT id, name, code, city, state, country, company_id FROM locations WHERE name LIKE ?', ['%Ahilyanagar%']);
  console.table(loc);

  console.log('=== 3. 10 EMPLOYEES IN ARHAM (AHILYANAGAR) ===');
  const [emps] = await conn.query(`
    SELECT 
      e.id, e.employee_code, CONCAT(e.first_name, ' ', e.last_name) as full_name,
      e.email, e.job_title, e.gender, e.bank_name, e.account_no,
      l.name as location_name, ss.gross_monthly, ss.net_take_home
    FROM employees e
    LEFT JOIN locations l ON e.current_location_id = l.id
    LEFT JOIN salary_structures ss ON ss.employee_id = e.id
    WHERE e.company_id = ?
  `, [companyId]);
  console.table(emps);

  console.log('=== 4. ARHAM PAYROLL CYCLE ===');
  const [cyc] = await conn.query('SELECT id, cycle_name, cycle_code, frequency, start_date, cutoff_day, disbursement_date_str, status FROM payroll_cycles WHERE company_id = ?', [companyId]);
  console.table(cyc);

  await conn.end();
}

verify().catch(console.error);
