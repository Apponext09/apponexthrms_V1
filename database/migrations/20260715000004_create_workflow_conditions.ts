import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('workflow_conditions');
  if (exists) return;

  await knex.schema.createTable('workflow_conditions', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('workflow_id').unsigned().notNullable();
    table.enum('condition_type', [
      'field_value',
      'numeric_comparison',
      'date_comparison',
      'approval_count'
    ]).notNullable();
    table.string('field_name', 100).nullable();
    table.enum('operator', [
      'equals',
      'not_equals',
      'greater_than',
      'less_than',
      'in_list',
      'contains'
    ]).notNullable();
    table.string('value', 255).nullable();
    table.bigInteger('next_step_id').unsigned().nullable();
    table.text('description').nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('workflow_id').references('workflows.id');
    table.foreign('next_step_id').references('workflow_steps.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.index('organization_id');
    table.index('workflow_id');
    table.index('condition_type');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workflow_conditions');
}




