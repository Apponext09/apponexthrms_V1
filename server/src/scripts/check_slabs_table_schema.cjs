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

async function checkSlabsTable() {
  try {
    const hasSlabsTable = await db.schema.hasTable('payroll_slabs');
    console.log('hasTable(payroll_slabs):', hasSlabsTable);
    if (hasSlabsTable) {
      const cols = await db('payroll_slabs').columnInfo();
      console.log('payroll_slabs columns:', Object.keys(cols));
      const sample = await db('payroll_slabs').select('*').limit(3);
      console.log('Sample rows:', sample);
    }

    const hasSalaryStructures = await db.schema.hasTable('salary_structures');
    console.log('hasTable(salary_structures):', hasSalaryStructures);
    if (hasSalaryStructures) {
      const cols = await db('salary_structures').columnInfo();
      console.log('salary_structures columns:', Object.keys(cols));
      const sample = await db('salary_structures').select('*').limit(3);
      console.log('Sample salary_structures rows:', sample);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

checkSlabsTable();
