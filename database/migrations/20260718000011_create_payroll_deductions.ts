import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('payroll_deductions', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('payroll_run_employee_id').unsigned().notNullable();
    table.bigInteger('component_id').unsigned().notNullable();
    table.decimal('calculated_value', 12, 2).notNullable();
    table.decimal('actual_value', 12, 2).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('payroll_run_employee_id').references('payroll_run_employees.id');
    table.foreign('component_id').references('salary_components.id');
    table.index('organization_id');
    table.index('payroll_run_employee_id');
    table.index('component_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payroll_deductions');
}



