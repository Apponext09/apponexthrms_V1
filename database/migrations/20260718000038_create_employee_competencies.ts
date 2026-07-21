import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('employee_competencies', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').notNullable();
    table.bigInteger('employee_id').notNullable();
    table.bigInteger('competency_id').notNullable();
    table.decimal('current_level', 5, 2).nullable();
    table.decimal('target_level', 5, 2).nullable();
    table.text('gap_analysis').nullable();
    table.bigInteger('created_by').notNullable();
    table.bigInteger('updated_by').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations');
    table.foreign('employee_id').references('id').inTable('employees');
    table.foreign('competency_id').references('id').inTable('competencies');
    table.foreign('created_by').references('id').inTable('users');
    table.foreign('updated_by').references('id').inTable('users');
    table.index('organization_id');
    table.index('employee_id');
    table.index('competency_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_competencies');
}
