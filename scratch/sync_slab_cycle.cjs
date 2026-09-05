const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function syncSlabs() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'happy'
  });

  const [res] = await conn.query('UPDATE payroll_slabs SET cycle_id = 5 WHERE organization_id = 3 AND (cycle_id != 5 OR cycle_id IS NULL)');
  console.log('Updated payroll_slabs cycle_id to 5 for org 3:', res.affectedRows, 'rows affected.');

  const [slabs] = await conn.query('SELECT id, name, cycle_id, selected_component_ids FROM payroll_slabs WHERE organization_id = 3');
  console.table(slabs);

  await conn.end();
}

syncSlabs().catch(console.error);
