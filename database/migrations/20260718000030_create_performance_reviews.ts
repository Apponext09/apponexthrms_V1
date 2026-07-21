import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('performance_reviews', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.bigInteger('reviewer_id').unsigned().notNullable();
    table.bigInteger('cycle_id').unsigned().notNullable();
    table.bigInteger('template_id').unsigned().notNullable();
    table.enum('status', ['draft', 'submitted', 'approved', 'rejected']).defaultTo('draft');
    table.decimal('overall_rating', 5, 2).nullable();
    table.date('review_date').nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations');
    table.foreign('employee_id').references('id').inTable('employees');
    table.foreign('reviewer_id').references('id').inTable('employees');
    table.foreign('cycle_id').references('id').inTable('review_cycles');
    table.foreign('template_id').references('id').inTable('review_templates');
    table.foreign('created_by').references('id').inTable('users');
    table.foreign('updated_by').references('id').inTable('users');
    table.index('organization_id');
    table.index('employee_id');
    table.index('reviewer_id');
    table.index('cycle_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('performance_reviews');
}
