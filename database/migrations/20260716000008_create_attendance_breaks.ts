import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('attendance_breaks', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('attendance_record_id').unsigned().notNullable();
    table.timestamp('break_start_time').notNullable();
    table.timestamp('break_end_time').nullable();
    table.integer('break_duration_minutes').nullable();
    table.enum('break_type', ['lunch', 'tea', 'personal']).defaultTo('lunch');
    table.enum('status', ['active', 'completed']).defaultTo('active');

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('attendance_record_id').references('attendance_records.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.index('organization_id');
    table.index('attendance_record_id');
    table.index('status');
    table.index('break_type');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('attendance_breaks');
}




