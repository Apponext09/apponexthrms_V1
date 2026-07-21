import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('leave_application_days', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('application_id').unsigned().notNullable();
    table.date('leave_date').notNullable();
    table.enum('day_type', ['full_day', 'half_day_first_half', 'half_day_second_half']).notNullable();
    table.boolean('is_holiday').defaultTo(false);
    table.boolean('is_weekend').defaultTo(false);
    table.enum('status', ['approved', 'rejected', 'pending']).defaultTo('pending');
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('application_id').references('leave_applications.id');
    table.unique(['application_id', 'leave_date']);
    table.index('organization_id');
    table.index('application_id');
    table.index('leave_date');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_application_days');
}



