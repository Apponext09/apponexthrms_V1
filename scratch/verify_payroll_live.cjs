const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function verifyPayrollChain() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'happy'
  });

  console.log('=== 1. PAYROLL CYCLES ===');
  const [cycles] = await conn.query('SELECT id, organization_id, company_id, cycle_name, frequency, start_date, cutoff_day, is_active FROM payroll_cycles WHERE organization_id=3');
  console.table(cycles);

  console.log('=== 2. PAYROLL COMPONENT GROUPS ===');
  const [groups] = await conn.query('SELECT id, organization_id, name, category, display_order, is_active FROM payroll_component_groups WHERE organization_id=3');
  console.table(groups);

  console.log('=== 3. PAYROLL COMPONENTS ===');
  const [comps] = await conn.query('SELECT id, organization_id, group_id, name, component_type, amount, formula, based_on_attendance, is_active FROM payroll_components WHERE organization_id=3');
  console.table(comps);

  console.log('=== 4. PAYROLL SLABS ===');
  const [slabs] = await conn.query('SELECT id, organization_id, name, min_ctc, max_ctc, is_active FROM payroll_slabs WHERE organization_id=3');
  console.table(slabs);

  console.log('=== 5. PAYROLL SLAB COMPONENTS ===');
  const [slabComps] = await conn.query('SELECT * FROM payroll_slab_components WHERE slab_id IN (SELECT id FROM payroll_slabs WHERE organization_id=3)');
  console.table(slabComps);

  console.log('=== 6. SALARY STRUCTURES ===');
  const [ss] = await conn.query('SELECT * FROM salary_structures WHERE employee_id IN (SELECT id FROM employees WHERE organization_id=3)');
  console.table(ss);

  console.log('=== 7. EMPLOYEE SALARY STRUCTURE LINK TABLE ===');
  const [ess] = await conn.query('SELECT * FROM employee_salary_structures WHERE employee_id IN (SELECT id FROM employees WHERE organization_id=3)');
  console.table(ess);

  console.log('=== 8. ACTIVE EMPLOYEES (Org 3) ===');
  const [emps] = await conn.query('SELECT id, first_name, last_name, employee_code, organization_id, company_id, status FROM employees WHERE organization_id=3 AND status = "active"');
  console.table(emps);

  await conn.end();
}

verifyPayrollChain().catch(console.error);
