import { getKnex } from '../db/knex';
import { up } from '../db/migrations/20260807_create_enterprise_payroll_tables';

async function run() {
  console.log('Running enterprise payroll migrations...');
  const db = getKnex();
  await up(db);
  console.log('Migration finished successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
