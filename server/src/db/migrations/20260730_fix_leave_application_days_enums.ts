import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('leave_application_days', (table) => {
    table.string('day_type', 50).notNullable().alter();
    table.string('status', 50).defaultTo('pending').alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  // Revert not required
}
