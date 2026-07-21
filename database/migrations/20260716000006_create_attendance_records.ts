import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('attendance_records', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.date('check_in_date').notNullable();
    table.timestamp('check_in_time').nullable();
    table.timestamp('check_out_time').nullable();
    table.integer('duration_minutes').nullable();
    table.integer('break_time_minutes').defaultTo(0);
    table.integer('work_duration_minutes').nullable();
    table.enum('status', ['present', 'absent', 'half_day', 'work_from_home', 'on_leave', 'holiday', 'weekly_off', 'sick']).defaultTo('absent');
    table.bigInteger('check_in_location_id').unsigned().nullable();
    table.bigInteger('check_out_location_id').unsigned().nullable();
    table.enum('check_in_method', ['web', 'mobile', 'gps', 'qr', 'biometric', 'kiosk', 'face_recognition']).nullable();
    table.enum('check_out_method', ['web', 'mobile', 'gps', 'qr', 'biometric', 'kiosk']).nullable();
    table.boolean('is_late').defaultTo(false);
    table.boolean('is_early_departure').defaultTo(false);
    table.boolean('is_regularized').defaultTo(false);
    table.bigInteger('regularization_request_id').unsigned().nullable();
    table.integer('overtime_minutes').defaultTo(0);
    table.text('notes').nullable();

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('check_in_location_id').references('attendance_locations.id');
    table.foreign('check_out_location_id').references('attendance_locations.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.unique(['organization_id', 'employee_id', 'check_in_date'], { indexName: 'attendance_org_emp_date_unique' });
    table.index('organization_id');
    table.index('employee_id');
    table.index('check_in_date');
    table.index('status');
    table.index('is_late');
    table.index('is_regularized');
    table.index(['employee_id', 'check_in_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('attendance_records');
}




