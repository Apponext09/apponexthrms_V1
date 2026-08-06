import { getKnex } from '../db/knex';

async function cleanup() {
  try {
    console.log('Cleaning up soft-deleted employee types from database...');
    const db = getKnex();

    const deletedCount = await db('employee_types')
      .whereNotNull('deleted_at')
      .del();

    console.log(`Successfully permanently deleted ${deletedCount} records from the database.`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to clean up records:', error);
    process.exit(1);
  }
}

cleanup();
