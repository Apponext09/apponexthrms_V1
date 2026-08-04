import knex from 'knex';
import config from './knexfile.js';

const db = knex(config.development);

async function run() {
  console.log('🔄 Executing migration for designations table columns...');

  const hasTable = await db.schema.hasTable('designations');
  if (!hasTable) {
    console.log('⚠️ designations table does not exist.');
    return;
  }

  const columns = ['mapped_companies', 'mapped_locations', 'mapped_departments', 'mapped_shifts', 'mapped_grades'];

  for (const col of columns) {
    const hasCol = await db.schema.hasColumn('designations', col);
    if (!hasCol) {
      await db.schema.alterTable('designations', (table) => {
        table.json(col).nullable();
      });
      console.log(`  ➕ Added column '${col}' to 'designations' table.`);
    } else {
      console.log(`  ℹ️ Column '${col}' already exists in 'designations' table.`);
    }
  }

  console.log('✅ Designation mapping columns migration completed successfully!');
}

run()
  .catch((err) => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  })
  .finally(() => db.destroy());
