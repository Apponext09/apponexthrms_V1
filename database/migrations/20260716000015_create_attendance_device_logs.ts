import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('attendance_device_logs');
  if (exists) return;

  await knex.schema.createTable('attendance_device_logs', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('device_id', 100).notNullable();
    table.enum('device_type', ['biometric', 'rfid', 'qr_scanner', 'face_recognition', 'kiosk']).notNullable();
    table.bigInteger('location_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().nullable();
    table.timestamp('punch_time').notNullable();
    table.enum('punch_type', ['check_in', 'break_in', 'break_out', 'check_out']).notNullable();
    table.integer('device_response_code').notNullable();
    table.text('device_response_message').nullable();
    table.boolean('processed').defaultTo(false);
    table.bigInteger('matched_attendance_id').unsigned().nullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('location_id').references('attendance_locations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('matched_attendance_id').references('attendance_records.id');

    table.index('organization_id');
    table.index('device_id');
    table.index('employee_id');
    table.index('punch_time');
    table.index('processed');
    table.index(['device_id', 'punch_time']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('attendance_device_logs');
}



