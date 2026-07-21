import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('employee_reporting_hierarchy', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.bigInteger('manager_id').unsigned().notNullable();
    table.integer('hierarchy_level').notNullable();
    table.json('path').nullable(); // JSON array of ancestor manager IDs

    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('manager_id').references('employees.id');

    table.unique(['organization_id', 'employee_id']);
    table.index('organization_id');
    table.index('manager_id');
    table.index('hierarchy_level');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_reporting_hierarchy');
}



