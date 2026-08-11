import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasJobsTable = await knex.schema.hasTable('jobs');
  if (hasJobsTable) {
    const hasMrfColumn = await knex.schema.hasColumn('jobs', 'mrf_request_id');
    if (!hasMrfColumn) {
      await knex.schema.alterTable('jobs', (table) => {
        table.bigInteger('mrf_request_id').unsigned().nullable();
      });
    }
    const hasMinExp = await knex.schema.hasColumn('jobs', 'min_experience_years');
    if (!hasMinExp) {
      await knex.schema.alterTable('jobs', (table) => {
        table.integer('min_experience_years').nullable();
        table.integer('max_experience_years').nullable();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasJobsTable = await knex.schema.hasTable('jobs');
  if (hasJobsTable) {
    const hasMrfColumn = await knex.schema.hasColumn('jobs', 'mrf_request_id');
    if (hasMrfColumn) {
      await knex.schema.alterTable('jobs', (table) => {
        table.dropColumn('mrf_request_id');
      });
    }
    const hasMinExp = await knex.schema.hasColumn('jobs', 'min_experience_years');
    if (hasMinExp) {
      await knex.schema.alterTable('jobs', (table) => {
        table.dropColumn('min_experience_years');
        table.dropColumn('max_experience_years');
      });
    }
  }
}
