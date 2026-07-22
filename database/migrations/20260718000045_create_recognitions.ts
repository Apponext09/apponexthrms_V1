import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('recognitions', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('recognized_by').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.enum('recognition_type', ['team_work', 'innovation', 'leadership', 'customer_focus', 'quality', 'other']).notNullable();
    table.integer('points_awarded').defaultTo(0);
    table.text('message').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations');
    table.foreign('recognized_by').references('id').inTable('employees');
    table.foreign('employee_id').references('id').inTable('employees');
    table.index('organization_id');
    table.index('employee_id');
    table.index('recognition_type');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('recognitions');
}

