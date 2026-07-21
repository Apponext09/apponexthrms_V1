import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('goals', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.bigInteger('goal_template_id').unsigned().nullable();
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.string('category', 100).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.decimal('target_value', 10, 2).nullable();
    table.decimal('progress', 5, 2).defaultTo(0);
    table.enum('status', ['draft', 'active', 'completed', 'cancelled']).defaultTo('draft');
    table.decimal('weight', 5, 2).defaultTo(1);
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations');
    table.foreign('employee_id').references('id').inTable('employees');
    table.foreign('goal_template_id').references('id').inTable('goal_templates');
    table.foreign('created_by').references('id').inTable('users');
    table.foreign('updated_by').references('id').inTable('users');
    table.index('organization_id');
    table.index('employee_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('goals');
}
