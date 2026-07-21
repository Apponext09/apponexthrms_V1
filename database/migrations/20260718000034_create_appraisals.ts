import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('appraisals', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').notNullable();
    table.bigInteger('employee_id').notNullable();
    table.bigInteger('cycle_id').notNullable();
    table.decimal('overall_rating', 5, 2).nullable();
    table.enum('status', ['draft', 'in_progress', 'completed', 'archived']).defaultTo('draft');
    table.bigInteger('created_by').notNullable();
    table.bigInteger('updated_by').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations');
    table.foreign('employee_id').references('id').inTable('employees');
    table.foreign('cycle_id').references('id').inTable('review_cycles');
    table.foreign('created_by').references('id').inTable('users');
    table.foreign('updated_by').references('id').inTable('users');
    table.index('organization_id');
    table.index('employee_id');
    table.index('cycle_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('appraisals');
}
