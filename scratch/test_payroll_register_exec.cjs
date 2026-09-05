const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function testPayrollCalculation() {
  // Execute server API route or calculate internally via Knex
  const { calculateEmployeeSalary } = require('./server/src/modules/payroll/services/SalaryCalculationService');
  
  console.log('Testing calculation engine for Org 3 employees...');
  
  const ctx = {
    organizationId: 3,
    companyId: null,
    userId: 7
  };

  const cycleId = 5;
  const payrollMonth = '2026-09';

  console.log('Target cycleId:', cycleId, 'Month:', payrollMonth);
  
  // Connect to DB and inspect
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'happy'
  });

  const [emps] = await conn.query('SELECT id, first_name, last_name, employee_code, organization_id, company_id FROM employees WHERE organization_id=3 AND status="active"');
  console.log(`Found ${emps.length} active employees for Org 3:`);
  console.table(emps);

  await conn.end();
}

testPayrollCalculation().catch(console.error);
