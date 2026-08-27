const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function inspectRun22() {
  const run = await db('payroll_runs').where('id', 22).first();
  console.log('Run #22 in DB:');
  console.log(JSON.stringify(run, null, 2));

  const allRuns = await db('payroll_runs');
  console.log('All runs in DB:', allRuns);

  await db.destroy();
}

inspectRun22().catch(console.error);
