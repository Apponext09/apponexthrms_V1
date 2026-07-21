import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('announcement_reads', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('announcement_id').unsigned().notNullable();
    table.bigInteger('user_id').unsigned().notNullable();
    table.timestamp('read_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('announcement_id').references('id').inTable('announcement_posts').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    table.unique(['announcement_id', 'user_id']);
    table.index('organization_id');
    table.index('announcement_id');
    table.index('user_id');
    table.index('read_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('announcement_reads');
}
