const axios = require('axios');

async function testApi() {
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

  const mappings = await db('salary_structures as ss')
    .join('employees as e', 'ss.employee_id', 'e.id')
    .leftJoin('payroll_slabs as ps', 'ss.slab_id', 'ps.id')
    .whereNull('ss.deleted_at')
    .whereNull('e.deleted_at')
    .select(
      'e.id as emp_id',
      'e.employee_code',
      'e.first_name',
      'e.last_name',
      'ps.name as slab_name',
      'ss.annual_ctc',
      'ss.gross_monthly'
    );

  console.log(`Verified ${mappings.length} employee mappings:`);
  console.table(mappings);

  await db.destroy();
}

testApi().catch(console.error);
