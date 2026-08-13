const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const knex = require('knex');

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
  },
});

async function main() {
  let log = '';
  try {
    const empColumns = await db('employees').columnInfo();
    log += '=== EMP COLUMNS ===\n' + JSON.stringify(Object.keys(empColumns), null, 2) + '\n\n';

    const userColumns = await db('users').columnInfo();
    log += '=== USER COLUMNS ===\n' + JSON.stringify(Object.keys(userColumns), null, 2) + '\n\n';

    const emp55 = await db('employees').where('id', 55).first();
    log += '=== EMP 55 ===\n' + JSON.stringify(emp55, null, 2) + '\n\n';

    const emp59 = await db('employees').where('id', 59).first();
    log += '=== EMP 59 ===\n' + JSON.stringify(emp59, null, 2) + '\n\n';

    const usersSample = await db('users').select('id', 'email', 'employee_id', 'employeeId', 'role').limit(10);
    log += '=== USERS ===\n' + JSON.stringify(usersSample, null, 2) + '\n\n';

  } catch (err) {
    log += 'ERROR: ' + err.stack + '\n';
  } finally {
    await db.destroy();
    fs.writeFileSync(path.join(__dirname, 'db_schema_info.txt'), log);
    console.log('DONE SCHEMA INFO WRITTEN');
  }
}

main();
