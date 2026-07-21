import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('shift_swap_requests', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.date('request_shift_date').notNullable();
    table.bigInteger('requested_shift_id').unsigned().notNullable();
    table.bigInteger('swap_with_employee_id').unsigned().notNullable();
    table.date('swap_shift_date').nullable();
    table.bigInteger('swap_shift_id').unsigned().nullable();
    table.text('reason').nullable();
    table.bigInteger('workflow_instance_id').unsigned().nullable();
    table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
    table.bigInteger('approved_by').unsigned().nullable();
    table.timestamp('approval_date').nullable();

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('swap_with_employee_id').references('employees.id');
    table.foreign('requested_shift_id').references('shift_templates.id');
    table.foreign('swap_shift_id').references('shift_templates.id');
    table.foreign('workflow_instance_id').references('workflow_instances.id');
    table.foreign('approved_by').references('users.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.index('organization_id');
    table.index('employee_id');
    table.index('status');
    table.index('request_shift_date');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('shift_swap_requests');
}




