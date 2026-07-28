import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('user_roles');
  if (exists) return;

  await knex.schema.createTable('user_roles', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('user_id').unsigned().notNullable();
    table.bigInteger('role_id').unsigned().notNullable();
    table.bigInteger('assigned_by').unsigned().notNullable();
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.foreign('assigned_by').references('id').inTable('users').onDelete('RESTRICT');

    table.unique(['user_id', 'role_id']);
    table.index('organization_id');
    table.index('user_id');
    table.index('role_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_roles');
}
