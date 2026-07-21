import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('holidays', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('holiday_calendar_id').unsigned().notNullable();
    table.string('holiday_name', 150).notNullable();
    table.date('holiday_date').notNullable();
    table.enum('holiday_type', ['national', 'regional', 'company']).defaultTo('company');
    table.boolean('is_optional').defaultTo(false);
    table.text('description').nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('holiday_calendar_id').references('holiday_calendars.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.unique(['holiday_calendar_id', 'holiday_date']);
    table.index('organization_id');
    table.index('holiday_calendar_id');
    table.index('holiday_date');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('holidays');
}




