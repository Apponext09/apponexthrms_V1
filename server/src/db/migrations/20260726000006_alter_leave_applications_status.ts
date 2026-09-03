import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('leave_applications');
  if (!hasTable) return;

  // Modify the status column to VARCHAR(50) to support all status values without truncation
  await knex.raw(`
    ALTER TABLE leave_applications 
    MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'draft'
  `);
}

export async function down(knex: Knex): Promise<void> {
  // No-op rollback for alter
}
