import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('permissions', (table) => {
    table.bigIncrements('id').primary();
    table.string('code', 100).notNullable().unique();
    table.string('module', 50).notNullable();
    table.string('resource', 50).notNullable();
    table.string('action', 50).notNullable();
    table.string('description', 500).nullable();
    table.boolean('is_system').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('module');
    table.index('resource');
    table.index('action');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('permissions');
}
