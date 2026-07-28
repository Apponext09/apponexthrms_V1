import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('loan_repayments');
  if (exists) return;

  await knex.schema.createTable('loan_repayments', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('loan_id').unsigned().notNullable();
    table.integer('emi_number').notNullable();
    table.decimal('emi_amount', 12, 2).notNullable();
    table.decimal('interest_amount', 12, 2).notNullable();
    table.decimal('principal_amount', 12, 2).notNullable();
    table.date('due_date').notNullable();
    table.date('paid_date').nullable();
    table.enum('status', ['pending', 'paid']).defaultTo('pending');
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('loan_id').references('employee_loans.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.index('organization_id');
    table.index('loan_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('loan_repayments');
}




