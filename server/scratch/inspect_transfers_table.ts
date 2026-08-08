import { getKnex } from '../src/db/knex';

async function inspectTransfers() {
  const db = getKnex();
  const columns = await db('employee_transfers').columnInfo();
  console.log('Columns of employee_transfers table:\n', JSON.stringify(columns, null, 2));

  const sampleRows = await db('employee_transfers').limit(3);
  console.log('\nSample rows in employee_transfers table:\n', JSON.stringify(sampleRows, null, 2));

  process.exit(0);
}

inspectTransfers().catch(err => {
  console.error(err);
  process.exit(1);
});
