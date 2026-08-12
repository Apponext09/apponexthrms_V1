import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasStatus = await knex.schema.hasColumn('leave_encashments', 'status');
  if (!hasStatus) {
    await knex.schema.alterTable('leave_encashments', (table) => {
      table.string('status', 50).notNullable().defaultTo('pending');
      table.string('reason', 255).nullable().defaultTo(null);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('leave_encashments', (table) => {
    table.dropColumn('status');
    table.dropColumn('reason');
  });
}
