import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('workflow_instances', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('workflow_id').unsigned().notNullable();
    table.string('entity_type', 100).notNullable();
    table.bigInteger('entity_id').unsigned().notNullable();
    table.bigInteger('initiator_id').unsigned().notNullable();
    table.enum('status', [
      'pending',
      'approved',
      'rejected',
      'cancelled',
      'reopened'
    ]).defaultTo('pending');
    table.integer('current_step_number').nullable();
    table.integer('approval_count').defaultTo(0);
    table.integer('rejection_count').defaultTo(0);
    table.timestamp('started_at').notNullable();
    table.timestamp('completed_at').nullable();
    table.enum('completion_status', [
      'approved',
      'rejected',
      'cancelled'
    ]).nullable();
    table.jsonb('metadata').nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('workflow_id').references('workflows.id');
    table.foreign('initiator_id').references('users.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.index('organization_id');
    table.index('workflow_id');
    table.index('entity_type');
    table.index('status');
    table.index('initiator_id');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workflow_instances');
}




