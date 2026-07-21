import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('payroll_adjustments', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('payroll_run_employee_id').unsigned().notNullable();
    table.enum('adjustment_type', ['bonus', 'arrears', 'deduction', 'recovery', 'other']).notNullable();
    table.string('adjustment_name', 100).notNullable();
    table.decimal('adjustment_amount', 15, 2).notNullable();
    table.string('reference_document_url', 500).nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('payroll_run_employee_id').references('payroll_run_employees.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.index('organization_id');
    table.index('payroll_run_employee_id');
    table.index('adjustment_type');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payroll_adjustments');
}




