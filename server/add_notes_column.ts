import { initializeKnex } from './src/db/knex';
import { getEnv } from './src/config/env';

async function main() {
  const knex = initializeKnex();
  const hasColumn = await knex.schema.hasColumn('attendance_records', 'notes');
  if (!hasColumn) {
    await knex.schema.alterTable('attendance_records', (table) => {
      table.text('notes').nullable();
    });
    console.log('Added notes column to attendance_records');
  } else {
    console.log('notes column already exists');
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
