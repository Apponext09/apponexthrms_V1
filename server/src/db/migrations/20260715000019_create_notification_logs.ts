import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('notification_logs');
  if (exists) return;

  await knex.schema.createTable('notification_logs', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('notification_id').unsigned().notNullable();
    table.enum('channel', ['email', 'sms', 'whatsapp', 'push', 'inapp', 'webhook']).notNullable();
    table.string('recipient_address', 500).notNullable();
    table.enum('status', ['sent', 'delivered', 'failed', 'bounced']).notNullable();
    table.integer('attempt_number').notNullable();
    table.integer('provider_response_code').nullable();
    table.text('provider_response_body').nullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.integer('execution_time_ms').nullable();

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('notification_id').references('id').inTable('notifications').onDelete('CASCADE');

    table.index('organization_id');
    table.index('notification_id');
    table.index('channel');
    table.index('status');
    table.index('timestamp');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_logs');
}
