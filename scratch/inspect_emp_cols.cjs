const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspectEmployeesSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'apponexthrms'
  });

  const [cols] = await connection.execute('DESCRIBE employees');
  console.log('Employees table columns:', cols.map(c => c.Field));

  const [empSample] = await connection.execute('SELECT * FROM employees LIMIT 1');
  console.log('Sample Employee:', empSample[0]);

  await connection.end();
}

inspectEmployeesSchema().catch(console.error);
