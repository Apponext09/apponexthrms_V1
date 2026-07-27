import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('leave_balances');
  if (exists) return;

  await knex.schema.createTable('leave_balances', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.bigInteger('leave_type_id').unsigned().notNullable();
    table.date('financial_year_start').notNullable();
    table.date('financial_year_end').notNullable();
    table.decimal('opening_balance', 6, 2).defaultTo(0);
    table.decimal('credited_balance', 6, 2).defaultTo(0);
    table.decimal('consumed_balance', 6, 2).defaultTo(0);
    table.decimal('available_balance', 6, 2).defaultTo(0);
    table.decimal('carry_forward_balance', 6, 2).defaultTo(0);
    table.decimal('encashed_balance', 6, 2).defaultTo(0);
    table.decimal('expired_balance', 6, 2).defaultTo(0);
    table.decimal('pending_approval_balance', 6, 2).defaultTo(0);
    table.timestamp('last_updated_at').defaultTo(knex.fn.now());
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('leave_type_id').references('leave_types.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.unique(['employee_id', 'leave_type_id', 'financial_year_start'], { indexName: 'leave_bal_emp_type_year_unique' });
    table.index('organization_id');
    table.index('employee_id');
    table.index('leave_type_id');
    table.index('financial_year_start');
    table.index('last_updated_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_balances');
}




