const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function approveRevision1() {
  await db('salary_revisions').where('id', 1).update({
    status: 'approved',
    approved_by: 10,
    approval_date: new Date(),
    updated_at: new Date()
  });

  // Update salary structure for employee 34
  await db('salary_structures').where('employee_id', 34).update({
    gross_monthly: Math.round(630000 / 12),
    annual_ctc: 630000,
    updated_at: new Date()
  });

  console.log('Approved revision #1 for Aarav Sharma and updated salary structure.');
  await db.destroy();
}

approveRevision1().catch(console.error);
