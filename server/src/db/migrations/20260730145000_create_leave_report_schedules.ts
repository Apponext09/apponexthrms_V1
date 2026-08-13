import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('leave_report_schedules');
  if (exists) return;

  await knex.schema.createTable('leave_report_schedules', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('user_id').unsigned().notNullable();
    table.string('schedule_name', 255).notNullable();
    table.enum('frequency', ['daily', 'weekly', 'monthly']).notNullable().defaultTo('weekly');
    table.string('entity', 100).notNullable();
    table.text('fields').notNullable();
    table.text('filters').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('user_id').references('users.id');
    table.index('organization_id');
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_report_schedules');
}
