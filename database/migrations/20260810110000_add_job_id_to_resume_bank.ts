import { Knex } from 'knex';

/**
 * Migration: Add nullable job_id and mrf_request_id to resume_bank table
 * 
 * Reversible migration establishing relational link from Resume Bank
 * entries to Jobs and MRF requests.
 */
export async function up(knex: Knex): Promise<void> {
  const hasResumeBank = await knex.schema.hasTable('resume_bank');
  if (hasResumeBank) {
    const hasJobId = await knex.schema.hasColumn('resume_bank', 'job_id');
    const hasMrfId = await knex.schema.hasColumn('resume_bank', 'mrf_request_id');

    await knex.schema.alterTable('resume_bank', (table) => {
      if (!hasJobId) {
        table.bigInteger('job_id').unsigned().nullable().after('candidate_id');
        table.foreign('job_id').references('jobs.id').onDelete('SET NULL');
        table.index('job_id');
      }

      if (!hasMrfId) {
        table.bigInteger('mrf_request_id').unsigned().nullable().after('job_id');
        table.foreign('mrf_request_id').references('mrf_requests.id').onDelete('SET NULL');
        table.index('mrf_request_id');
      }
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasResumeBank = await knex.schema.hasTable('resume_bank');
  if (hasResumeBank) {
    const hasJobId = await knex.schema.hasColumn('resume_bank', 'job_id');
    const hasMrfId = await knex.schema.hasColumn('resume_bank', 'mrf_request_id');

    await knex.schema.alterTable('resume_bank', (table) => {
      if (hasJobId) {
        table.dropForeign(['job_id']);
        table.dropIndex(['job_id']);
        table.dropColumn('job_id');
      }
      if (hasMrfId) {
        table.dropForeign(['mrf_request_id']);
        table.dropIndex(['mrf_request_id']);
        table.dropColumn('mrf_request_id');
      }
    });
  }
}
