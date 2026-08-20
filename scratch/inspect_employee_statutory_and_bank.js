const knex = require('knex');
require('dotenv').config({ path: './server/.env' });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hrms',
  }
});

async function check() {
  const tables = await db.raw(`SHOW TABLES`);
  const tableNames = tables[0].map(r => Object.values(r)[0]);
  console.log('Tables matching bank or statutory or employee:');
  console.log(tableNames.filter(t => t.includes('bank') || t.includes('statut') || t.includes('emp') || t.includes('comp')));

  // Check columns on employees table
  const empCols = await db.raw(`DESCRIBE employees`);
  console.log('\nEmployees columns related to bank/statutory:');
  console.log(empCols[0].map(c => c.Field).filter(f => f.includes('bank') || f.includes('account') || f.includes('pan') || f.includes('uan') || f.includes('pf') || f.includes('esic') || f.includes('ifsc')));

  // Check sample employee
  const sample = await db('employees').first();
  console.log('\nSample employee bank & statutory fields:');
  console.log({
    id: sample.id,
    name: `${sample.first_name} ${sample.last_name}`,
    bank_name: sample.bank_name,
    account_no: sample.account_no,
    ifsc_code: sample.ifsc_code,
    pan: sample.pan,
    uan: sample.uan,
    pf_no: sample.pf_no,
    esic_no: sample.esic_no
  });

  await db.destroy();
}

check().catch(console.error);
