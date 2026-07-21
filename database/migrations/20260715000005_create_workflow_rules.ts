import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('workflow_rules', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('workflow_id').unsigned().notNullable();
    table.string('rule_name', 255).notNullable();
    table.text('rule_description').nullable();
    table.enum('rule_type', [
      'auto_approval',
      'auto_rejection',
      'skip_step',
      'escalation_trigger'
    ]).notNullable();
    table.jsonb('condition_json').notNullable();
    table.jsonb('action_json').notNullable();
    table.boolean('is_enabled').defaultTo(true);
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('workflow_id').references('workflows.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.index('organization_id');
    table.index('workflow_id');
    table.index('rule_type');
    table.index('is_enabled');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workflow_rules');
}




