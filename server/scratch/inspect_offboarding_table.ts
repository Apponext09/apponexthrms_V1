import { getKnex } from '../src/db/knex';

async function inspectOffboarding() {
  const db = getKnex();
  const [cols] = await db.raw('SHOW COLUMNS FROM employee_offboarding_records');
  console.log('Columns in employee_offboarding_records:\n', cols.map((c: any) => `${c.Field} (${c.Type})`));

  const sampleRows = await db('employee_offboarding_records').limit(3);
  console.log('\nSample rows in employee_offboarding_records table:\n', JSON.stringify(sampleRows, null, 2));

  process.exit(0);
}

inspectOffboarding().catch(err => {
  console.error(err);
  process.exit(1);
});
