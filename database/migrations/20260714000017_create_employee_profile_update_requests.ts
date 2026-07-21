import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('employee_profile_update_requests', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();

    table.enum('request_type', ['personal_info', 'contact', 'bank_details', 'emergency_contact']).notNullable();
    table.json('current_value').nullable();
    table.json('requested_value').nullable();
    table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
    table.bigInteger('workflow_instance_id').unsigned().nullable();

    table.timestamp('submitted_at').defaultTo(knex.fn.now());
    table.timestamp('approved_at').nullable();
    table.bigInteger('approved_by').unsigned().nullable();
    table.text('rejection_reason').nullable();

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('approved_by').references('users.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.index('organization_id');
    table.index('employee_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_profile_update_requests');
}




