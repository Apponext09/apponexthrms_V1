import knex from 'knex';
import config from './knexfile.js';
import { up } from './migrations/20260804000001_create_grades.js';

const db = knex(config.development);

async function run() {
  console.log('🔄 Executing migration: 20260804000001_create_grades.ts...');
  await up(db);
  console.log('✅ grades table created/updated successfully!');
}

run()
  .catch((err) => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  })
  .finally(() => db.destroy());
