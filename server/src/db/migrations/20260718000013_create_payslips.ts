import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('payslips');
  if (exists) return;

  await knex.schema.createTable('payslips', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.bigInteger('payroll_run_id').unsigned().notNullable();
    table.date('payslip_month').notNullable();
    table.string('payslip_number', 100).notNullable();
    table.decimal('ctc', 15, 2).notNullable();
    table.decimal('basic_salary', 12, 2).notNullable();
    table.decimal('gross_salary', 15, 2).notNullable();
    table.decimal('total_deductions', 15, 2).notNullable();
    table.decimal('net_salary', 15, 2).notNullable();
    table.decimal('ytd_gross', 15, 2).notNullable().defaultTo(0);
    table.decimal('ytd_tax', 15, 2).notNullable().defaultTo(0);
    table.decimal('ytd_net', 15, 2).notNullable().defaultTo(0);
    table.string('payslip_pdf_url', 500).nullable();
    table.text('payslip_html').nullable();
    table.boolean('is_locked').defaultTo(false);
    table.timestamp('locked_at').nullable();
    table.boolean('digitally_signed').defaultTo(false);
    table.timestamp('signature_timestamp').nullable();
    table.timestamp('sent_to_employee_at').nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('payroll_run_id').references('payroll_runs.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.unique(['organization_id', 'payslip_number']);
    table.index('organization_id');
    table.index('employee_id');
    table.index('payroll_run_id');
    table.index('payslip_month');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payslips');
}




