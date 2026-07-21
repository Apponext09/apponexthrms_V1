import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('workflow_steps', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('workflow_id').unsigned().notNullable();
    table.integer('step_number').notNullable();
    table.string('step_name', 255).notNullable();
    table.text('step_description').nullable();
    table.enum('approval_mode', [
      'single_person',
      'any_one_person',
      'all_people',
      'manager_chain',
      'department_head',
      'role_based',
      'dynamic_resolver'
    ]).defaultTo('single_person');
    table.enum('approver_type', [
      'specific_user',
      'user_role',
      'reporting_manager',
      'department_head',
      'dynamic_group'
    ]).notNullable();
    table.bigInteger('approver_id').unsigned().nullable();
    table.bigInteger('approver_role_id').unsigned().nullable();
    table.integer('max_approvers').nullable();
    table.boolean('can_delegate').defaultTo(true);
    table.boolean('can_reject').defaultTo(true);
    table.boolean('can_reassign').defaultTo(true);
    table.integer('timeout_days').nullable();
    table.integer('sla_days').nullable();
    table.boolean('is_final_step').defaultTo(false);
    table.string('action_on_approval', 100).defaultTo('approve_workflow');
    table.string('action_on_rejection', 100).defaultTo('terminate_workflow');
    table.text('notes').nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('workflow_id').references('workflows.id');
    table.foreign('approver_id').references('users.id');
    table.foreign('approver_role_id').references('roles.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.unique(['workflow_id', 'step_number']);
    table.index('organization_id');
    table.index('workflow_id');
    table.index('approver_type');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workflow_steps');
}




