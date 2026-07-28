import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('employees');
  if (exists) return;

  await knex.schema.createTable('employees', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('employee_code', 50).notNullable();
    table.enum('status', ['candidate', 'onboarding', 'probation', 'active', 'notice', 'exit', 'alumni']).defaultTo('candidate');

    // Personal Info
    table.string('first_name', 100).notNullable();
    table.string('middle_name', 100).nullable();
    table.string('last_name', 100).notNullable();
    table.string('email', 255).notNullable();
    table.string('phone', 20).nullable();
    table.string('mobile', 20).nullable();
    table.date('date_of_birth').nullable();
    table.enum('gender', ['male', 'female', 'other']).nullable();
    table.string('blood_group', 10).nullable();
    table.string('nationality', 100).nullable();

    // Identity
    table.string('aadhar_number', 20).nullable();
    table.string('pan_number', 20).nullable();
    table.string('passport_number', 50).nullable();

    // Organizational
    table.bigInteger('current_designation_id').unsigned().nullable();
    table.bigInteger('current_department_id').unsigned().nullable();
    table.bigInteger('current_branch_id').unsigned().nullable();
    table.bigInteger('current_location_id').unsigned().nullable();
    table.bigInteger('reporting_manager_id').unsigned().nullable();
    table.bigInteger('cost_center_id').unsigned().nullable();

    // Employment Details
    table.enum('employment_type', ['full_time', 'part_time', 'contract', 'internship']).defaultTo('full_time');
    table.date('date_of_joining').notNullable();
    table.date('date_of_confirmation').nullable();
    table.date('probation_end_date').nullable();

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('current_designation_id').references('designations.id');
    table.foreign('current_department_id').references('departments.id');
    table.foreign('current_branch_id').references('branches.id');
    table.foreign('current_location_id').references('locations.id');
    table.foreign('reporting_manager_id').references('employees.id');
    table.foreign('cost_center_id').references('cost_centers.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.unique(['organization_id', 'employee_code']);
    table.unique(['organization_id', 'email']);
    table.index('organization_id');
    table.index('status');
    table.index('created_at');
    table.index('reporting_manager_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employees');
}




