import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('workflow_delegations');
  if (exists) return;

  await knex.schema.createTable('workflow_delegations', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('instance_step_id').unsigned().notNullable();
    table.bigInteger('delegated_from_user_id').unsigned().notNullable();
    table.bigInteger('delegated_to_user_id').unsigned().notNullable();
    table.text('delegation_reason').nullable();
    table.date('delegation_start_date').notNullable();
    table.date('delegation_end_date').notNullable();
    table.enum('status', [
      'active',
      'expired',
      'revoked'
    ]).defaultTo('active');
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('instance_step_id').references('workflow_instance_steps.id');
    table.foreign('delegated_from_user_id').references('users.id');
    table.foreign('delegated_to_user_id').references('users.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.index('organization_id');
    table.index('instance_step_id');
    table.index('delegated_from_user_id');
    table.index('delegated_to_user_id');
    table.index('status');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workflow_delegations');
}




