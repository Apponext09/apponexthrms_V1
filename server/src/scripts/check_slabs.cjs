const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'apponexthrms',
  }
});

async function checkSlabs() {
  const slabs = await knex('payroll_slabs');
  console.log("Total Payroll Slabs in DB:", slabs.length);
  console.log(slabs);

  const activeSlabs = slabs.filter(s => !s.deleted_at);
  console.log("Active Slabs count:", activeSlabs.length);


  await knex.destroy();
}

checkSlabs();
