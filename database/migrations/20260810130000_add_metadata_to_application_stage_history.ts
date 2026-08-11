import { Knex } from 'knex';

/**
 * Migration: Add metadata JSON column to application_stage_history table
 * 
 * Stores trigger context (e.g., assessment scores, automated transition metadata)
 * alongside manual movement notes.
 */
export async function up(knex: Knex): Promise<void> {
  const hasHistoryTable = await knex.schema.hasTable('application_stage_history');
  if (hasHistoryTable) {
    const hasMetadata = await knex.schema.hasColumn('application_stage_history', 'metadata');
    if (!hasMetadata) {
      await knex.schema.alterTable('application_stage_history', (table) => {
        table.json('metadata').nullable().after('notes');
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasHistoryTable = await knex.schema.hasTable('application_stage_history');
  if (hasHistoryTable) {
    const hasMetadata = await knex.schema.hasColumn('application_stage_history', 'metadata');
    if (hasMetadata) {
      await knex.schema.alterTable('application_stage_history', (table) => {
        table.dropColumn('metadata');
      });
    }
  }
}
