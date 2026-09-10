import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('employee_attendance_locations');
  if (hasTable) return;

  await knex.schema.createTable('employee_attendance_locations', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.bigInteger('geofence_id').unsigned().notNullable();
    table.boolean('is_primary').notNullable().defaultTo(false);
    table.boolean('allow_remote_punch').notNullable().defaultTo(false);
    table.boolean('allow_field_punch').notNullable().defaultTo(false);
    table.text('notes').nullable();

    table.bigInteger('created_by').unsigned().nullable();
    table.bigInteger('updated_by').unsigned().nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['organization_id', 'employee_id', 'geofence_id'], {
      indexName: 'uq_emp_geofence_mapping',
    });
    table.foreign('organization_id').references('organizations.id').onDelete('CASCADE');
    table.foreign('employee_id').references('employees.id').onDelete('CASCADE');
    table.foreign('geofence_id').references('attendance_geofences.id').onDelete('CASCADE');

    table.index(['organization_id', 'employee_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_attendance_locations');
}
