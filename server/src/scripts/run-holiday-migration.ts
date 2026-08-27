import { initializeKnex } from '../db/knex';
import { up } from '../db/migrations/20260824000001_create_master_holiday_calendar_submodule';

async function main() {
  const db = initializeKnex();
  try {
    console.log('Running master holiday calendar submodule migration...');
    await up(db);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

main();
