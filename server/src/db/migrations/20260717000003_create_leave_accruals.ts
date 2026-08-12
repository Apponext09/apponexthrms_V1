import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('leave_accruals');
  if (exists) return;

  await knex.schema.createTable('leave_accruals', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.bigInteger('leave_type_id').unsigned().notNullable();
    table.date('accrual_date').notNullable();
    table.enum('accrual_type', ['monthly', 'quarterly', 'yearly']).notNullable();
    table.decimal('accrued_days', 6, 2).notNullable();
    table.bigInteger('policy_id').unsigned().notNullable();
    table.boolean('processed').defaultTo(false);
    table.text('notes').nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('leave_type_id').references('leave_types.id');
    table.foreign('policy_id').references('leave_policies.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.index('organization_id');
    table.index('employee_id');
    table.index('leave_type_id');
    table.index('accrual_date');
    table.index('processed');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_accruals');
}




