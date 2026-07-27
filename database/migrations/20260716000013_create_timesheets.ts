import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('timesheets');
  if (exists) return;

  await knex.schema.createTable('timesheets', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.date('timesheet_period_start').notNullable();
    table.date('timesheet_period_end').notNullable();
    table.decimal('total_hours', 6, 2).defaultTo(0);
    table.decimal('billable_hours', 6, 2).defaultTo(0);
    table.decimal('non_billable_hours', 6, 2).defaultTo(0);
    table.enum('status', ['draft', 'submitted', 'approved', 'rejected']).defaultTo('draft');
    table.bigInteger('submitted_by').unsigned().nullable();
    table.timestamp('submitted_at').nullable();
    table.bigInteger('approved_by').unsigned().nullable();
    table.timestamp('approved_at').nullable();
    table.text('rejection_reason').nullable();

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('submitted_by').references('users.id');
    table.foreign('approved_by').references('users.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.unique(['organization_id', 'employee_id', 'timesheet_period_start', 'timesheet_period_end'], { indexName: 'timesheets_period_unique' });
    table.index('organization_id');
    table.index('employee_id');
    table.index('status');
    table.index('timesheet_period_start');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('timesheets');
}




