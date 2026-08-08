import { getKnex } from '../src/db/knex';

async function checkDesigs() {
  const db = getKnex();
  const rows = await db('designations').select('id', 'name', 'code', 'organization_id');
  console.log('Designations in DB:\n', rows);
  process.exit(0);
}

checkDesigs();
