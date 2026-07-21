import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('review_cycles', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').notNullable();
    table.string('name', 255).notNullable();
    table.enum('cycle_type', ['annual', 'semi_annual', 'quarterly', 'monthly']).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.enum('status', ['planning', 'active', 'review', 'completed', 'archived']).defaultTo('planning');
    table.bigInteger('created_by').notNullable();
    table.bigInteger('updated_by').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations');
    table.foreign('created_by').references('id').inTable('users');
    table.foreign('updated_by').references('id').inTable('users');
    table.index('organization_id');
    table.index('cycle_type');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('review_cycles');
}
