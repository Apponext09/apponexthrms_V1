import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('employee_compensation', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();

    table.decimal('base_salary', 12, 2).nullable();
    table.string('currency', 3).defaultTo('INR');
    table.bigInteger('salary_structure_id').unsigned().nullable();

    table.string('bank_name', 100).nullable();
    table.string('account_number', 30).nullable();
    table.string('ifsc_code', 20).nullable();

    table.string('uan_number', 50).nullable();
    table.string('esic_number', 50).nullable();
    table.string('pension_number', 50).nullable();

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('salary_structure_id').references('payroll_policies.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.unique(['organization_id', 'employee_id']);
    table.index('organization_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_compensation');
}




