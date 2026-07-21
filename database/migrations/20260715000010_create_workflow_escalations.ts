import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('workflow_escalations', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('instance_step_id').unsigned().notNullable();
    table.bigInteger('escalated_from_user_id').unsigned().notNullable();
    table.bigInteger('escalated_to_user_id').unsigned().notNullable();
    table.integer('escalation_level').notNullable();
    table.text('escalation_reason').nullable();
    table.timestamp('escalation_date').notNullable();
    table.enum('status', [
      'pending',
      'resolved'
    ]).defaultTo('pending');
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('instance_step_id').references('workflow_instance_steps.id');
    table.foreign('escalated_from_user_id').references('users.id');
    table.foreign('escalated_to_user_id').references('users.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.index('organization_id');
    table.index('instance_step_id');
    table.index('escalation_level');
    table.index('status');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workflow_escalations');
}




