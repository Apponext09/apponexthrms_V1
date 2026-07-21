import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('workflow_instance_steps', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('instance_id').unsigned().notNullable();
    table.bigInteger('step_id').unsigned().notNullable();
    table.integer('step_number').notNullable();
    table.enum('status', [
      'pending',
      'approved',
      'rejected',
      'skipped',
      'in_progress'
    ]).defaultTo('pending');
    table.bigInteger('approver_id').unsigned().nullable();
    table.timestamp('assigned_at').nullable();
    table.timestamp('started_at').nullable();
    table.timestamp('completed_at').nullable();
    table.enum('approval_action', [
      'approve',
      'reject',
      'delegate',
      'escalate'
    ]).nullable();
    table.text('approval_comment').nullable();
    table.text('approver_notes').nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('instance_id').references('workflow_instances.id');
    table.foreign('step_id').references('workflow_steps.id');
    table.foreign('approver_id').references('users.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.unique(['instance_id', 'step_number']);
    table.index('organization_id');
    table.index('instance_id');
    table.index('approver_id');
    table.index('status');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workflow_instance_steps');
}




