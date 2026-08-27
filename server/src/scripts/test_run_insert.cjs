const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function testPayrollRunInsert() {
  const insertPayload = {
    uuid: require('crypto').randomUUID(),
    organization_id: 8,
    company_id: 18,
    payroll_cycle_id: 13,
    run_type: 'regular',
    run_month: '2026-09-01',
    status: 'draft',
    total_employees: 10,
    processed_employees: 0,
    error_count: 0,
    created_by: 10,
    updated_by: 10,
    created_at: new Date(),
    updated_at: new Date()
  };

  const [runId] = await db('payroll_runs').insert(insertPayload);
  console.log(`Successfully created test Payroll Run with ID: ${runId}`);

  const fetched = await db('payroll_runs').where('id', runId).first();
  console.log('Fetched Run from DB:', {
    id: fetched.id,
    run_month: fetched.run_month,
    status: fetched.status,
    company_id: fetched.company_id
  });

  // Clean up test run
  await db('payroll_runs').where('id', runId).del();
  console.log('Cleaned up test run successfully.');

  await db.destroy();
}

testPayrollRunInsert().catch(console.error);
