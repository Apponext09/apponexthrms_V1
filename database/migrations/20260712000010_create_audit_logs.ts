import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('audit_logs', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('actor_user_id').unsigned().nullable();
    table.string('action', 100).notNullable();
    table.string('entity_type', 100).notNullable();
    table.string('entity_id', 255).notNullable();
    table.json('before_state').nullable();
    table.json('after_state').nullable();
    table.string('ip_address', 45).nullable();
    table.text('user_agent').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('actor_user_id').references('id').inTable('users').onDelete('SET NULL');

    table.index(['organization_id', 'entity_type', 'entity_id']);
    table.index(['organization_id', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
}
