import type { Knex } from 'knex';

/** Optional display priority for each role's sidebar modules. */
export async function up(knex: Knex): Promise<void> {
  if (!await knex.schema.hasColumn('roles', 'module_order')) {
    await knex.schema.alterTable('roles', (table) => table.json('module_order').nullable());
  }
}

export async function down(_knex: Knex): Promise<void> {
  // Keep role-specific ordering intact if a deployment is rolled back.
}
