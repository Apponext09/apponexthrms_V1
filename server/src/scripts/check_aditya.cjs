const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../.env') });

const knex = require('knex');
const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
  }
});

async function main() {
  const rows = await db('employees')
    .where('first_name', 'like', '%Aditya%')
    .orWhere('last_name', 'like', '%Nair%');
  
  console.log('FOUND ADITYA NAIR ROWS:', JSON.stringify(rows, null, 2));

  const allEmps = await db('employees').select('id', 'first_name', 'last_name', 'status', 'organization_id', 'company_id', 'deleted_at');
  console.log('ALL EMPLOYEES COUNT:', allEmps.length);
  console.log('ALL EMPLOYEES LIST:', JSON.stringify(allEmps, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
