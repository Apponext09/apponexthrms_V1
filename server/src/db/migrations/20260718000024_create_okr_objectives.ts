import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('okr_objectives');
  if (exists) return;

  await knex.schema.createTable('okr_objectives', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.bigInteger('aligned_to_goal_id').unsigned().nullable();
    table.bigInteger('owner_id').unsigned().notNullable();
    table.enum('status', ['planning', 'active', 'completed', 'abandoned']).defaultTo('planning');
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations');
    table.foreign('aligned_to_goal_id').references('id').inTable('goals');
    table.foreign('owner_id').references('id').inTable('employees');
    table.foreign('created_by').references('id').inTable('users');
    table.foreign('updated_by').references('id').inTable('users');
    table.index('organization_id');
    table.index('owner_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('okr_objectives');
}

