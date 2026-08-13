import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('notification_recipients');
  if (exists) return;

  await knex.schema.createTable('notification_recipients', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('notification_id').unsigned().notNullable();
    table.bigInteger('recipient_id').unsigned().notNullable();
    table.enum('recipient_type', ['to', 'cc', 'bcc']).defaultTo('to');
    table.enum('status', ['queued', 'sent', 'delivered', 'failed']).defaultTo('queued');
    table.timestamp('sent_at').nullable();
    table.timestamp('delivered_at').nullable();
    table.timestamp('read_at').nullable();
    table.timestamp('opened_at').nullable(); // email open tracking
    table.timestamp('clicked_at').nullable(); // link click tracking
    table.text('error_message').nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('notification_id').references('id').inTable('notifications').onDelete('CASCADE');
    table.foreign('recipient_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('users').onDelete('RESTRICT');

    table.unique(['notification_id', 'recipient_id']);
    table.index('organization_id');
    table.index('notification_id');
    table.index('recipient_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_recipients');
}

