const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function diagnose() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'happy'
  });

  const [emps] = await conn.query('SELECT id, first_name, last_name, organization_id, company_id, status, deleted_at FROM employees WHERE organization_id=3');
  console.log('Employees in Org 3:');
  console.table(emps);

  const [users] = await conn.query('SELECT id, email, organization_id, company_id FROM users WHERE email="abhishek@gmail.com"');
  console.log('User abhishek:');
  console.table(users);

  await conn.end();
}

diagnose().catch(console.error);
