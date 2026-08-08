import { getKnex } from '../src/db/knex';

async function listCols() {
  const db = getKnex();
  const [cols] = await db.raw('SHOW COLUMNS FROM employee_transfers');
  console.log('Columns in employee_transfers:\n', cols.map((c: any) => `${c.Field} (${c.Type})`));
  process.exit(0);
}

listCols();
