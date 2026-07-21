import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('role_permissions', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('role_id').unsigned().notNullable();
    table.bigInteger('permission_id').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.foreign('permission_id').references('id').inTable('permissions').onDelete('CASCADE');

    table.unique(['role_id', 'permission_id']);
    table.index('role_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('role_permissions');
}
