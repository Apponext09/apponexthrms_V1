import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Employee Transfers Table
  await knex.schema.createTable('employee_transfers', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();

    table.bigInteger('from_department_id').unsigned().nullable();
    table.bigInteger('to_department_id').unsigned().nullable();

    table.bigInteger('from_designation_id').unsigned().nullable();
    table.bigInteger('to_designation_id').unsigned().nullable();

    table.bigInteger('from_location_id').unsigned().nullable();
    table.bigInteger('to_location_id').unsigned().nullable();

    table.bigInteger('from_reporting_manager_id').unsigned().nullable();
    table.bigInteger('to_reporting_manager_id').unsigned().nullable();

    table.date('effective_date').notNullable();
    table.string('transfer_type', 100).notNullable().defaultTo('department_change');
    table.text('transfer_reason').nullable();
    table.text('notes').nullable();

    table.bigInteger('created_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('created_by').references('users.id');

    table.index('organization_id');
    table.index('employee_id');
    table.index('effective_date');
  });

  // 2. Employee Onboarding Records Table
  await knex.schema.createTable('employee_onboarding_records', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();

    table.string('interviewer_name').nullable();
    table.bigInteger('interviewer_id').unsigned().nullable();
    table.string('onboarded_by_name').nullable();
    table.bigInteger('onboarded_by_id').unsigned().nullable();

    table.date('interview_date').nullable();
    table.string('interview_rating', 50).nullable();
    table.text('interview_notes').nullable();

    table.date('joining_date').nullable();
    table.date('probation_end_date').nullable();

    table.boolean('orientation_completed').defaultTo(false);
    table.boolean('documents_verified').defaultTo(false);
    table.boolean('welcome_kit_issued').defaultTo(false);
    table.text('notes').nullable();

    table.bigInteger('created_by').unsigned().nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');

    table.unique(['organization_id', 'employee_id']);
    table.index('organization_id');
    table.index('employee_id');
  });

  // 3. Employee Offboarding Records Table
  await knex.schema.createTable('employee_offboarding_records', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();

    table.string('exit_type', 100).notNullable().defaultTo('resignation');
    table.date('resignation_date').nullable();
    table.integer('notice_period_days').defaultTo(30);
    table.date('relieving_date').nullable();
    table.date('last_working_day').nullable();

    table.string('exit_interviewer_name').nullable();
    table.bigInteger('exit_interviewer_id').unsigned().nullable();

    table.text('exit_reason').nullable();
    table.text('exit_notes').nullable();

    table.boolean('assets_returned').defaultTo(false);
    table.string('fnf_status', 50).defaultTo('pending');

    table.bigInteger('created_by').unsigned().nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');

    table.unique(['organization_id', 'employee_id']);
    table.index('organization_id');
    table.index('employee_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_offboarding_records');
  await knex.schema.dropTableIfExists('employee_onboarding_records');
  await knex.schema.dropTableIfExists('employee_transfers');
}
