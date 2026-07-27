import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('notification_queue');
  if (exists) return;

  await knex.schema.createTable('notification_queue', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('notification_id').unsigned().notNullable();
    table.enum('channel', ['email', 'sms', 'whatsapp', 'push', 'inapp', 'webhook']).notNullable();
    table.string('recipient_email', 255).nullable();
    table.string('recipient_phone', 20).nullable();
    table.string('recipient_push_token', 500).nullable();
    table.string('recipient_webhook_url', 500).nullable();
    table.enum('status', ['pending', 'processing', 'delivered', 'failed']).defaultTo('pending');
    table.integer('priority').defaultTo(5); // higher = process first
    table.integer('attempt_count').defaultTo(0);
    table.timestamp('last_attempted_at').nullable();
    table.timestamp('next_attempt_at').nullable();
    table.text('error_message').nullable();
    table.integer('response_code').nullable();
    table.text('response_body').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('notification_id').references('id').inTable('notifications').onDelete('CASCADE');

    table.index('organization_id');
    table.index('notification_id');
    table.index(['status', 'priority']);
    table.index('next_attempt_at');
    table.index('channel');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_queue');
}
