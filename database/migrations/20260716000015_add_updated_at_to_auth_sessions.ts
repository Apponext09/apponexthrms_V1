import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('auth_sessions', (table) => {
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('auth_sessions', (table) => {
    table.dropColumn('updated_at');
  });
}
