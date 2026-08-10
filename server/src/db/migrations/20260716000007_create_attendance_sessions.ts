import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('attendance_sessions');
  if (exists) return;

  await knex.schema.createTable('attendance_sessions', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('attendance_record_id').unsigned().notNullable();
    table.enum('session_type', ['check_in', 'break_in', 'break_out', 'check_out']).notNullable();
    table.timestamp('session_timestamp').notNullable();
    table.string('device_id', 100).nullable();
    table.decimal('device_latitude', 10, 7).nullable();
    table.decimal('device_longitude', 10, 7).nullable();
    table.boolean('geofence_matched').nullable();
    table.string('ip_address', 50).nullable();
    table.string('user_agent', 500).nullable();
    table.text('session_notes').nullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('attendance_record_id').references('attendance_records.id');

    table.index('organization_id');
    table.index('attendance_record_id');
    table.index('session_type');
    table.index('session_timestamp');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('attendance_sessions');
}



