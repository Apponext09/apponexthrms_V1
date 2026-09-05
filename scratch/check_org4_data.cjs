const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function checkOrg4() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'happy'
  });

  console.log('=== EMPLOYEES IN ORG 4 ===');
  const [emps] = await conn.query('SELECT id, first_name, last_name, employee_code, organization_id, company_id, status FROM employees WHERE organization_id=4');
  console.table(emps);

  console.log('=== PAYROLL CYCLES IN ORG 4 ===');
  const [cycles] = await conn.query('SELECT id, organization_id, cycle_name, frequency, start_date, cutoff_day, is_active FROM payroll_cycles WHERE organization_id=4 OR organization_id IS NULL');
  console.table(cycles);

  console.log('=== PAYROLL COMPONENTS IN ORG 4 ===');
  const [comps] = await conn.query('SELECT id, organization_id, name, component_type, formula, is_active FROM payroll_components WHERE organization_id=4');
  console.table(comps);

  console.log('=== SALARY STRUCTURES IN ORG 4 ===');
  const [ss] = await conn.query('SELECT id, employee_id, slab_id, annual_ctc, basic_monthly, gross_monthly, effective_from FROM salary_structures WHERE organization_id=4');
  console.table(ss);

  await conn.end();
}

checkOrg4().catch(console.error);
