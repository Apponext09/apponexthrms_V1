import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('payroll_run_employees');
  if (exists) return;

  await knex.schema.createTable('payroll_run_employees', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('payroll_run_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.enum('status', ['pending', 'processed', 'error']).defaultTo('pending');
    table.integer('working_days').nullable();
    table.decimal('leave_days', 6, 2).nullable();
    table.decimal('paid_leave_days', 6, 2).nullable();
    table.decimal('unpaid_leave_days', 6, 2).nullable();
    table.decimal('overtime_hours', 6, 2).nullable();
    table.decimal('total_earnings', 15, 2).notNullable().defaultTo(0);
    table.decimal('total_deductions', 15, 2).notNullable().defaultTo(0);
    table.decimal('net_salary', 15, 2).notNullable().defaultTo(0);
    table.decimal('tax_deducted', 15, 2).notNullable().defaultTo(0);
    table.text('processing_notes').nullable();
    table.timestamp('processed_at').nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('payroll_run_id').references('payroll_runs.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.unique(['payroll_run_id', 'employee_id']);
    table.index('organization_id');
    table.index('payroll_run_id');
    table.index('employee_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payroll_run_employees');
}




