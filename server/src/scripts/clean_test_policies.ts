import { getKnex } from '../db/knex';

async function clean() {
  const db = getKnex();
  await db('policy_documents').where('title', 'like', '%Automated Test%').delete();
  console.log('Cleaned up test policies.');
  await db.destroy();
}

clean();
