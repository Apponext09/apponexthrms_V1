import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('auth_sessions', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('user_id').unsigned().notNullable();
    table.string('refresh_token_hash', 255).notNullable();
    table.string('device_id', 255).nullable();
    table.string('device_name', 255).nullable();
    table.enum('device_type', ['web', 'mobile', 'tablet', 'api']).defaultTo('web');
    table.text('user_agent').nullable();
    table.string('ip_address', 45).notNullable();
    table.string('location', 255).nullable();
    table.boolean('is_trusted').defaultTo(false);
    table.timestamp('last_active_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
    table.timestamp('revoked_at').nullable();
    table.string('revoked_reason', 255).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    table.index('user_id');
    table.index('organization_id');
    table.index('expires_at');
    table.index('device_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('auth_sessions');
}
