import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('advance_recoveries', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('advance_id').unsigned().notNullable();
    table.date('recovery_month').notNullable();
    table.decimal('recovery_amount', 12, 2).notNullable();
    table.bigInteger('payroll_run_id').unsigned().nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('advance_id').references('salary_advances.id');
    table.foreign('payroll_run_id').references('payroll_runs.id');
    table.index('organization_id');
    table.index('advance_id');
    table.index('recovery_month');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('advance_recoveries');
}



