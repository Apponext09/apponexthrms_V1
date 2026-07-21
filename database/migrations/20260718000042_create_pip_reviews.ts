import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('pip_reviews', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').notNullable();
    table.bigInteger('pip_id').notNullable();
    table.date('review_date').notNullable();
    table.enum('status', ['in_progress', 'completed', 'passed', 'failed']).notNullable();
    table.text('notes').nullable();
    table.bigInteger('created_by').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations');
    table.foreign('pip_id').references('id').inTable('performance_improvement_plans');
    table.foreign('created_by').references('id').inTable('users');
    table.index('organization_id');
    table.index('pip_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('pip_reviews');
}
