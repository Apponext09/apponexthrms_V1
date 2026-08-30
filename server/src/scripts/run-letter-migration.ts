import { getKnex } from '../db/knex';
import { up } from '../db/migrations/20260826000001_create_letter_management';

async function run() {
  const knex = getKnex();
  console.log('Running letter management tables migration...');
  try {
    await up(knex);
    console.log('✅ Letter management tables created successfully!');
    
    // Check if table exists
    const hasTemplates = await knex.schema.hasTable('letter_templates');
    const hasLetters = await knex.schema.hasTable('generated_letters');
    console.log(`letter_templates exists: ${hasTemplates}, generated_letters exists: ${hasLetters}`);

    // Insert record in knex_migrations so Knex tracker knows
    const hasMigrationTable = await knex.schema.hasTable('knex_migrations');
    if (hasMigrationTable) {
      const existing = await knex('knex_migrations').where('name', '20260826000001_create_letter_management.ts').first();
      if (!existing) {
        const lastBatch = await knex('knex_migrations').max('batch as maxBatch').first();
        const batchNo = Number(lastBatch?.maxBatch || 1) + 1;
        await knex('knex_migrations').insert({
          name: '20260826000001_create_letter_management.ts',
          batch: batchNo,
          migration_time: new Date(),
        });
        console.log('✅ Migration registered in knex_migrations');
      }
    }
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

run();
