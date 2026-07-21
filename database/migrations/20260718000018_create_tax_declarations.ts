import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tax_declarations', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.string('financial_year', 10).notNullable();
    table.string('pan_number', 20).nullable();
    table.date('declaration_date').notNullable();
    table.enum('status', ['pending', 'declared', 'finalized']).defaultTo('pending');
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.unique(['organization_id', 'employee_id', 'financial_year']);
    table.index('organization_id');
    table.index('employee_id');
    table.index('financial_year');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tax_declarations');
}




