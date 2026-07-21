import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('password_history', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('user_id').unsigned().notNullable();
    table.string('password_hash', 255).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    table.index(['user_id', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('password_history');
}
