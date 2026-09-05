import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('payroll_runs');
  if (exists) return;

  await knex.schema.createTable('payroll_runs', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('payroll_cycle_id').unsigned().notNullable();
    table.enum('run_type', ['regular', 'off_cycle', 'final_settlement', 'arrears']).notNullable();
    table.date('run_month').notNullable();
    table.enum('status', ['draft', 'processing', 'calculated', 'locked', 'approved', 'published', 'completed']).defaultTo('draft');
    table.bigInteger('locked_by').unsigned().nullable();
    table.timestamp('locked_at').nullable();
    table.bigInteger('approved_by').unsigned().nullable();
    table.timestamp('approved_at').nullable();
    table.timestamp('published_at').nullable();
    table.integer('total_employees').notNullable().defaultTo(0);
    table.integer('processed_employees').notNullable().defaultTo(0);
    table.integer('error_count').notNullable().defaultTo(0);
    table.text('processing_notes').nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('payroll_cycle_id').references('payroll_cycles.id');
    table.foreign('locked_by').references('users.id');
    table.foreign('approved_by').references('users.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.index('organization_id');
    table.index('payroll_cycle_id');
    table.index('status');
    table.index('run_month');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payroll_runs');
}




