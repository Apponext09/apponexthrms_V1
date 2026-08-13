import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('employee_shift_assignments');
  if (exists) return;

  await knex.schema.createTable('employee_shift_assignments', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.bigInteger('shift_id').unsigned().notNullable();
    table.bigInteger('shift_rotation_id').unsigned().nullable();
    table.date('assignment_start_date').notNullable();
    table.date('assignment_end_date').nullable();
    table.boolean('is_current').defaultTo(true);

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('shift_id').references('shift_templates.id');
    table.foreign('shift_rotation_id').references('shift_rotations.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.index('organization_id');
    table.index('employee_id');
    table.index('shift_id');
    table.index('is_current');
    table.index('assignment_start_date');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_shift_assignments');
}




