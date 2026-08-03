import { getKnex } from '../db/knex';

async function checkTables() {
  const db = getKnex();
  try {
    const tables = await db.raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables:', tables.rows ? tables.rows.map((r: any) => r.table_name) : tables);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkTables();
