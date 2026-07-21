import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('employee_loans', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.enum('loan_type', ['personal', 'vehicle', 'home', 'education']).notNullable();
    table.decimal('loan_amount', 15, 2).notNullable();
    table.date('loan_date').notNullable();
    table.integer('tenure_months').notNullable();
    table.decimal('interest_rate', 5, 2).nullable();
    table.decimal('emi', 12, 2).notNullable();
    table.decimal('total_amount_with_interest', 15, 2).notNullable();
    table.decimal('repaid_amount', 15, 2).notNullable().defaultTo(0);
    table.decimal('outstanding_amount', 15, 2).notNullable();
    table.enum('status', ['active', 'closed', 'defaulted']).defaultTo('active');
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
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_loans');
}




