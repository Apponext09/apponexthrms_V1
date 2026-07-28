import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('feedback_requests');
  if (exists) return;

  await knex.schema.createTable('feedback_requests', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.bigInteger('reviewer_id').unsigned().notNullable();
    table.bigInteger('cycle_id').unsigned().notNullable();
    table.enum('feedback_type', ['self', 'peer', 'manager', 'direct_report', '360']).notNullable();
    table.enum('status', ['pending', 'completed', 'expired']).defaultTo('pending');
    table.date('deadline').notNullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations');
    table.foreign('employee_id').references('id').inTable('employees');
    table.foreign('reviewer_id').references('id').inTable('employees');
    table.foreign('cycle_id').references('id').inTable('review_cycles');
    table.foreign('created_by').references('id').inTable('users');
    table.foreign('updated_by').references('id').inTable('users');
    table.index('organization_id');
    table.index('employee_id');
    table.index('reviewer_id');
    table.index('feedback_type');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('feedback_requests');
}

