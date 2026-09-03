import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasUpdatedAt = await knex.schema.hasColumn('leave_application_days', 'updated_at');
  const hasDeletedAt = await knex.schema.hasColumn('leave_application_days', 'deleted_at');

  await knex.schema.alterTable('leave_application_days', (table) => {
    if (!hasUpdatedAt) {
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    }
    if (!hasDeletedAt) {
      table.timestamp('deleted_at').nullable();
    }
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('leave_application_days', (table) => {
    table.dropColumn('updated_at');
    table.dropColumn('deleted_at');
  });
}
