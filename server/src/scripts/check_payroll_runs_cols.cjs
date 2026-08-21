const knex = require('knex');
require('dotenv').config();

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms'
  }
});

async function checkPayrollRunsCols() {
  try {
    const cols = await db('payroll_runs').columnInfo();
    console.log('payroll_runs Columns:', Object.keys(cols));
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

checkPayrollRunsCols();
