import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('comp_off_balances', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.date('comp_off_earned_date').notNullable();
    table.decimal('comp_off_earned_hours', 4, 2).notNullable();
    table.date('comp_off_expires_at').nullable();
    table.date('comp_off_used_date').nullable();
    table.decimal('comp_off_used_hours', 4, 2).nullable();
    table.enum('status', ['available', 'used', 'expired']).defaultTo('available');
    table.text('reason').nullable();
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
    table.index('comp_off_earned_date');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('comp_off_balances');
}




