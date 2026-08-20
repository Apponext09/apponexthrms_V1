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

async function run() {
  const employees = await db('employees').whereNull('deleted_at').select('id', 'first_name', 'last_name', 'employee_code');
  const mappings = await db('salary_structures as ss')
    .leftJoin('payroll_slabs as ps', 'ss.slab_id', 'ps.id')
    .whereNull('ss.deleted_at')
    .select('ss.employee_id', 'ps.name as slab_name', 'ss.annual_ctc', 'ss.gross_monthly');

  const map = new Map();
  mappings.forEach(m => {
    if (m.employee_id) map.set(m.employee_id, m);
  });

  const merged = employees.map(e => {
    const m = map.get(e.id);
    return {
      id: e.id,
      code: e.employee_code,
      name: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
      current_slab: m ? m.slab_name : '⚠️ Unassigned',
      annual_ctc: m ? `₹${Number(m.annual_ctc).toLocaleString('en-IN')}` : '—',
      status: m ? '✅ Assigned' : '⚠️ Needs Assignment'
    };
  });

  console.log('MASS UPLOAD GRID VIEW SIMULATION:');
  console.table(merged);
  await db.destroy();
}

run().catch(console.error);
