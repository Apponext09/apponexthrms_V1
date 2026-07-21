import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('leave_cancellations', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('application_id').unsigned().notNullable();
    table.text('cancellation_reason').notNullable();
    table.timestamp('cancellation_requested_at').defaultTo(knex.fn.now());
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
    table.foreign('application_id').references('leave_applications.id');
    table.foreign('workflow_instance_id').references('workflow_instances.id');
    table.foreign('approved_by').references('users.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.index('organization_id');
    table.index('application_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_cancellations');
}




