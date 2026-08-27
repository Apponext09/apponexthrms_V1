const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function fixUserRoleAndApprove() {
  // 1. Fix user 10 role
  await db('users').where('id', 10).update({ role: 'organization_admin' });
  console.log('Updated user 10 role to organization_admin.');

  // 2. Approve revision 2
  await db('salary_revisions').where('id', 2).update({
    status: 'approved',
    approved_by: 10,
    approval_date: new Date(),
    updated_at: new Date()
  });

  // 3. Update salary structure for Aarav Sharma (emp 34) to 690000
  await db('salary_structures').where('employee_id', 34).update({
    gross_monthly: Math.round(690000 / 12),
    annual_ctc: 690000,
    updated_at: new Date()
  });

  console.log('Approved revision #2 for Aarav Sharma and updated CTC to 6,90,000.');
  await db.destroy();
}

fixUserRoleAndApprove().catch(console.error);
