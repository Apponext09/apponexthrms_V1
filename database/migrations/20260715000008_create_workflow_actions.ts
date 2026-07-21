import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('workflow_actions', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('instance_id').unsigned().notNullable();
    table.enum('action_type', [
      'email_notification',
      'create_task',
      'update_field',
      'call_webhook'
    ]).notNullable();
    table.string('action_target', 255).nullable();
    table.jsonb('action_params').nullable();
    table.enum('status', [
      'pending',
      'completed',
      'failed'
    ]).defaultTo('pending');
    table.timestamp('executed_at').nullable();
    table.text('error_message').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('instance_id').references('workflow_instances.id');
    table.index('organization_id');
    table.index('instance_id');
    table.index('action_type');
    table.index('status');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workflow_actions');
}



