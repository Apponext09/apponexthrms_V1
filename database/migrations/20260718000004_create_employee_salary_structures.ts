import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('employee_salary_structures', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.bigInteger('salary_structure_id').unsigned().notNullable();
    table.date('effective_from').notNullable();
    table.date('effective_to').nullable();
    table.boolean('is_current').defaultTo(true);
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('salary_structure_id').references('salary_structures.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.index('organization_id');
    table.index('employee_id');
    table.index('salary_structure_id');
    table.index('is_current');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_salary_structures');
}




