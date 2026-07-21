import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('leave_policy_assignments', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.bigInteger('leave_policy_id').unsigned().notNullable();
    table.bigInteger('leave_type_id').unsigned().notNullable();
    table.integer('annual_quota').notNullable();
    table.decimal('monthly_accrual', 5, 2).nullable();
    table.decimal('quarterly_accrual', 5, 2).nullable();
    table.integer('yearly_accrual').nullable();
    table.boolean('carry_forward_enabled').defaultTo(true);
    table.integer('carry_forward_limit').nullable();
    table.boolean('encashment_enabled').defaultTo(false);
    table.integer('encashment_limit').nullable();
    table.integer('maximum_balance').nullable();
    table.boolean('can_take_negative').defaultTo(false);
    table.boolean('sandwich_policy_enabled').defaultTo(true);
    table.boolean('probation_excluded').defaultTo(false);
    table.date('assignment_start_date').notNullable();
    table.date('assignment_end_date').nullable();
    table.boolean('is_active').defaultTo(true);
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('leave_policy_id').references('leave_policies.id');
    table.foreign('leave_type_id').references('leave_types.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.unique(['employee_id', 'leave_type_id']);
    table.index('organization_id');
    table.index('employee_id');
    table.index('leave_policy_id');
    table.index('leave_type_id');
    table.index('is_active');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_policy_assignments');
}




