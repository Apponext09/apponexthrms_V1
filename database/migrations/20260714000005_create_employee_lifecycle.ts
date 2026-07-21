import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('employee_lifecycle', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();

    table.enum('from_status', ['candidate', 'onboarding', 'probation', 'active', 'notice', 'exit', 'alumni']).nullable();
    table.enum('to_status', ['candidate', 'onboarding', 'probation', 'active', 'notice', 'exit', 'alumni']).notNullable();
    table.date('transition_date').notNullable();
    table.text('notes').nullable();

    table.bigInteger('created_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('created_by').references('users.id');

    table.index('organization_id');
    table.index('employee_id');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_lifecycle');
}



