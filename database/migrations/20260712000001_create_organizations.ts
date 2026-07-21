import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('organizations', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.string('name', 255).notNullable();
    table.string('slug', 50).notNullable().unique();
    table.string('domain', 255).nullable();
    table.string('logo_url', 512).nullable();
    table.string('industry', 100).nullable();
    table.string('company_size', 50).nullable();
    table.string('timezone', 50).defaultTo('UTC');
    table.string('locale', 10).defaultTo('en');
    table.enum('status', ['trial', 'active', 'suspended', 'cancelled']).defaultTo('trial');
    table.enum('plan_tier', ['starter', 'professional', 'enterprise']).defaultTo('starter');
    table.json('allowed_ip_ranges').nullable();
    table.json('settings');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.index('status');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('organizations');
}

