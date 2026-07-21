import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sso_identities', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('user_id').unsigned().notNullable();
    table.enum('provider', ['google', 'microsoft']).notNullable();
    table.string('provider_user_id', 255).notNullable();
    table.string('provider_email', 255).notNullable();
    table.text('access_token_encrypted').nullable();
    table.text('refresh_token_encrypted').nullable();
    table.json('raw_profile').nullable();
    table.timestamp('linked_at').defaultTo(knex.fn.now());
    table.timestamp('last_used_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    table.unique(['provider', 'provider_user_id']);
    table.index('user_id');
    table.index('organization_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sso_identities');
}
