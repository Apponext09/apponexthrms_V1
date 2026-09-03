import type { Knex } from 'knex';

/**
 * Migration: Add job_id and mrf_request_id to resume_bank table
 * 
 * Links sourced resumes directly to jobs and MRF requests while
 * preserving backward compatibility with existing records.
 */
export async function up(knex: Knex): Promise<void> {
  const hasResumeBank = await knex.schema.hasTable('resume_bank');
  if (hasResumeBank) {
    const hasJobId = await knex.schema.hasColumn('resume_bank', 'job_id');
    if (!hasJobId) {
      await knex.schema.alterTable('resume_bank', (table) => {
        table.integer('job_id').unsigned().nullable().after('candidate_id');
        table.integer('mrf_request_id').unsigned().nullable().after('job_id');
        
        table.foreign('job_id').references('jobs.id').onDelete('SET NULL');
        table.foreign('mrf_request_id').references('mrf_requests.id').onDelete('SET NULL');
        
        table.index('job_id');
        table.index('mrf_request_id');
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasResumeBank = await knex.schema.hasTable('resume_bank');
  if (hasResumeBank) {
    await knex.schema.alterTable('resume_bank', (table) => {
      table.dropForeign(['job_id']);
      table.dropForeign(['mrf_request_id']);
      table.dropIndex(['job_id']);
      table.dropIndex(['mrf_request_id']);
      table.dropColumn('job_id');
      table.dropColumn('mrf_request_id');
    });
  }
}
