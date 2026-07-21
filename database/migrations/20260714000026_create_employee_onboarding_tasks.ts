import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('employee_onboarding_tasks', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('onboarding_instance_id').unsigned().notNullable();
    table.bigInteger('item_id').unsigned().notNullable();

    table.bigInteger('assigned_to_user_id').unsigned().notNullable();
    table.enum('status', ['pending', 'in_progress', 'completed']).defaultTo('pending');
    table.date('completion_date').nullable();
    table.text('completion_notes').nullable();

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('onboarding_instance_id').references('employee_onboarding_instances.id');
    table.foreign('item_id').references('onboarding_checklist_items.id');
    table.foreign('assigned_to_user_id').references('users.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.index('organization_id');
    table.index('onboarding_instance_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_onboarding_tasks');
}




