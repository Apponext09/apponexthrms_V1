import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('employee_education', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();

    table.string('education_type', 50).notNullable();
    table.string('institution', 200).notNullable();
    table.string('field_of_study', 100).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').nullable();
    table.decimal('score', 5, 2).nullable();
    table.string('certificate_file_url', 500).nullable();

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.index('organization_id');
    table.index('employee_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_education');
}




