import { Knex } from 'knex';

/**
 * Migration: Add resume_bank_id and ensure source on candidates table
 * 
 * Links candidates directly back to their original Resume Bank entry
 * for end-to-end sourcing traceability.
 */
export async function up(knex: Knex): Promise<void> {
  const hasCandidates = await knex.schema.hasTable('candidates');
  if (hasCandidates) {
    const hasResumeBankId = await knex.schema.hasColumn('candidates', 'resume_bank_id');
    const hasSource = await knex.schema.hasColumn('candidates', 'source');

    await knex.schema.alterTable('candidates', (table) => {
      if (!hasResumeBankId) {
        table.bigInteger('resume_bank_id').unsigned().nullable().after('organization_id');
        table.foreign('resume_bank_id').references('resume_bank.id').onDelete('SET NULL');
        table.index('resume_bank_id');
      }

      if (!hasSource) {
        table.string('source', 100).nullable().after('status');
        table.index('source');
      }
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasCandidates = await knex.schema.hasTable('candidates');
  if (hasCandidates) {
    const hasResumeBankId = await knex.schema.hasColumn('candidates', 'resume_bank_id');
    if (hasResumeBankId) {
      await knex.schema.alterTable('candidates', (table) => {
        table.dropForeign(['resume_bank_id']);
        table.dropIndex(['resume_bank_id']);
        table.dropColumn('resume_bank_id');
      });
    }
  }
}
