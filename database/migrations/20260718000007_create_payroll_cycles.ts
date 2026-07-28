import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('payroll_cycles');
  if (exists) return;

  await knex.schema.createTable('payroll_cycles', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('cycle_name', 100).notNullable();
    table.string('cycle_code', 50).notNullable();
    table.enum('cycle_type', ['monthly', 'biweekly', 'weekly', 'fortnightly']).notNullable();
    table.date('cycle_start_date').notNullable();
    table.date('cycle_end_date').notNullable();
    table.date('payroll_run_date').notNullable();
    table.date('salary_credit_date').notNullable();
    table.boolean('is_current_cycle').defaultTo(false);
    table.enum('status', ['open', 'locked', 'closed']).defaultTo('open');
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.unique(['organization_id', 'cycle_code']);
    table.index('organization_id');
    table.index('status');
    table.index('is_current_cycle');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payroll_cycles');
}




