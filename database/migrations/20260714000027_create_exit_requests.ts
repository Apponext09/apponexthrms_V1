import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('exit_requests');
  if (exists) return;

  await knex.schema.createTable('exit_requests', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();

    table.date('resignation_date').notNullable();
    table.date('last_working_day').notNullable();
    table.text('reason_for_leaving').nullable();
    table.integer('notice_period_served').nullable();

    table.enum('status', ['initiated', 'approved', 'rejected', 'completed']).defaultTo('initiated');
    table.bigInteger('workflow_instance_id').unsigned().nullable();
    table.bigInteger('approved_by').unsigned().nullable();
    table.timestamp('approval_date').nullable();

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('approved_by').references('users.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.index('organization_id');
    table.index('employee_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('exit_requests');
}




