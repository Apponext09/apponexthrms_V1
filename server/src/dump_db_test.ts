import { getKnex } from './db/knex';

async function checkDb() {
  const db = getKnex();
  try {
    console.log('=== DEPARTMENTS ===');
    const depts = await db('departments').select('*');
    console.log(JSON.stringify(depts, null, 2));

    console.log('=== DESIGNATIONS ===');
    const desigs = await db('designations').select('*');
    console.log(JSON.stringify(desigs, null, 2));

    console.log('=== MRF REQUESTS ===');
    const mrfs = await db('mrf_requests').select('*');
    console.log(JSON.stringify(mrfs, null, 2));
  } catch (err) {
    console.error('Error querying DB:', err);
  }
  process.exit(0);
}

checkDb();
