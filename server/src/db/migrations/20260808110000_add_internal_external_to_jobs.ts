import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasJobsTable = await knex.schema.hasTable('jobs');
  if (hasJobsTable) {
    const hasIsInternal = await knex.schema.hasColumn('jobs', 'is_internal');
    if (!hasIsInternal) {
      await knex.schema.alterTable('jobs', (table) => {
        table.boolean('is_internal').defaultTo(false);
      });
    }
    const hasIsPubExt = await knex.schema.hasColumn('jobs', 'is_published_external');
    if (!hasIsPubExt) {
      await knex.schema.alterTable('jobs', (table) => {
        table.boolean('is_published_external').defaultTo(true);
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasJobsTable = await knex.schema.hasTable('jobs');
  if (hasJobsTable) {
    const hasIsInternal = await knex.schema.hasColumn('jobs', 'is_internal');
    if (hasIsInternal) {
      await knex.schema.alterTable('jobs', (table) => {
        table.dropColumn('is_internal');
      });
    }
    const hasIsPubExt = await knex.schema.hasColumn('jobs', 'is_published_external');
    if (hasIsPubExt) {
      await knex.schema.alterTable('jobs', (table) => {
        table.dropColumn('is_published_external');
      });
    }
  }
}
