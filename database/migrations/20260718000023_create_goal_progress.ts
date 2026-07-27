import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('goal_progress');
  if (exists) return;

  await knex.schema.createTable('goal_progress', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('goal_id').unsigned().notNullable();
    table.decimal('progress_value', 10, 2).notNullable();
    table.text('notes').nullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations');
    table.foreign('goal_id').references('id').inTable('goals');
    table.foreign('updated_by').references('id').inTable('users');
    table.index('organization_id');
    table.index('goal_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('goal_progress');
}
