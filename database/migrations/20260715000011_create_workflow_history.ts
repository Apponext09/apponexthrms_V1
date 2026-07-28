import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('workflow_history');
  if (exists) return;

  await knex.schema.createTable('workflow_history', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('instance_id').unsigned().notNullable();
    table.enum('action', [
      'created',
      'step_assigned',
      'approved',
      'rejected',
      'delegated',
      'escalated',
      'completed',
      'cancelled'
    ]).notNullable();
    table.bigInteger('actor_id').unsigned().notNullable();
    table.string('actor_role', 100).nullable();
    table.jsonb('entity_changes').nullable();
    table.text('comments').nullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('instance_id').references('workflow_instances.id');
    table.foreign('actor_id').references('users.id');
    table.index('organization_id');
    table.index('instance_id');
    table.index('action');
    table.index('actor_id');
    table.index('timestamp');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workflow_history');
}



