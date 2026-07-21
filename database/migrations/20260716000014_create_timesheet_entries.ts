import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('timesheet_entries', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('timesheet_id').unsigned().notNullable();
    table.date('entry_date').notNullable();
    table.bigInteger('project_id').unsigned().nullable();
    table.string('task_name', 255).notNullable();
    table.text('task_description').nullable();
    table.decimal('hours_spent', 4, 2).notNullable();
    table.boolean('is_billable').defaultTo(true);
    table.decimal('billable_rate', 8, 2).nullable();
    table.enum('effort_category', ['development', 'design', 'qa', 'documentation', 'support']).nullable();
    table.enum('entry_status', ['draft', 'submitted']).defaultTo('draft');

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('timesheet_id').references('timesheets.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.index('organization_id');
    table.index('timesheet_id');
    table.index('entry_date');
    table.index('entry_status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('timesheet_entries');
}




