import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('leave_applications', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.bigInteger('leave_type_id').unsigned().notNullable();
    table.date('application_start_date').notNullable();
    table.date('application_end_date').notNullable();
    table.decimal('total_days', 6, 2).notNullable();
    table.boolean('is_half_day').defaultTo(false);
    table.enum('half_day_period', ['first_half', 'second_half']).nullable();
    table.boolean('is_hourly').defaultTo(false);
    table.decimal('hourly_duration', 4, 2).nullable();
    table.text('reason_description').nullable();
    table.string('supporting_document_url', 500).nullable();
    table.bigInteger('workflow_instance_id').unsigned().nullable();
    table.enum('status', ['draft', 'submitted', 'approved', 'rejected', 'cancelled', 'withdrawn']).defaultTo('draft');
    table.timestamp('submitted_at').nullable();
    table.bigInteger('submitted_by_user_id').unsigned().nullable();
    table.bigInteger('approved_by').unsigned().nullable();
    table.timestamp('approval_date').nullable();
    table.text('rejection_reason').nullable();
    table.bigInteger('cancelled_by').unsigned().nullable();
    table.timestamp('cancelled_at').nullable();
    table.text('cancellation_reason').nullable();
    table.timestamp('withdrawn_at').nullable();
    table.bigInteger('withdrawn_by').unsigned().nullable();
    table.text('withdrawn_reason').nullable();
    table.boolean('is_sandwich_day').defaultTo(false);
    table.bigInteger('delegated_to_user_id').unsigned().nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('leave_type_id').references('leave_types.id');
    table.foreign('workflow_instance_id').references('workflow_instances.id');
    table.foreign('submitted_by_user_id').references('users.id');
    table.foreign('approved_by').references('users.id');
    table.foreign('cancelled_by').references('users.id');
    table.foreign('withdrawn_by').references('users.id');
    table.foreign('delegated_to_user_id').references('users.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.index('organization_id');
    table.index('employee_id');
    table.index('leave_type_id');
    table.index('status');
    table.index('application_start_date');
    table.index('application_end_date');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_applications');
}




