import { getKnex } from './server/src/db/knex';

async function checkSchema() {
  const db = getKnex();
  try {
    const columns = await db.raw('DESCRIBE `salary_structures`');
    console.log('Columns in `salary_structures` table:\n', columns[0]);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

checkSchema();
