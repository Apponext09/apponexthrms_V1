import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notification_preferences', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('user_id').unsigned().notNullable();
    table.boolean('email_enabled').defaultTo(true);
    table.boolean('sms_enabled').defaultTo(true);
    table.boolean('whatsapp_enabled').defaultTo(true);
    table.boolean('push_enabled').defaultTo(true);
    table.boolean('inapp_enabled').defaultTo(true);
    table.boolean('webhook_enabled').defaultTo(true);
    table.time('quiet_hours_start').nullable();
    table.time('quiet_hours_end').nullable();
    table.boolean('quiet_hours_enabled').defaultTo(false);
    table.boolean('unsubscribe_all').defaultTo(false);
    table.json('preferences_json'); // per-category preferences
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('users').onDelete('RESTRICT');
    table.foreign('updated_by').references('id').inTable('users').onDelete('RESTRICT');

    table.unique(['organization_id', 'user_id']);
    table.index('organization_id');
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_preferences');
}

