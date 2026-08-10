import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('notifications');
  if (exists) return;

  await knex.schema.createTable('notifications', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('event_code', 100).notNullable();
    table.bigInteger('template_id').unsigned().notNullable();
    table.bigInteger('recipient_id').unsigned().notNullable();
    table.json('channels'); // array
    table.string('subject_line', 255).nullable();
    table.text('body_text').notNullable();
    table.json('variables'); // object with actual values
    table.enum('status', ['queued', 'sent', 'delivered', 'failed', 'cancelled']).defaultTo('queued');
    table.enum('priority', ['low', 'normal', 'high', 'urgent']).defaultTo('normal');
    table.timestamp('scheduled_at').nullable();
    table.timestamp('sent_at').nullable();
    table.timestamp('read_at').nullable();
    table.bigInteger('read_by_user_id').unsigned().nullable();
    table.text('error_message').nullable();
    table.integer('retry_count').defaultTo(0);
    table.timestamp('next_retry_at').nullable();
    table.string('related_entity_type', 100).nullable();
    table.bigInteger('related_entity_id').unsigned().nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('template_id').references('id').inTable('notification_templates').onDelete('RESTRICT');
    table.foreign('recipient_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('read_by_user_id').references('id').inTable('users').onDelete('SET NULL');
    table.foreign('created_by').references('id').inTable('users').onDelete('RESTRICT');
    table.foreign('updated_by').references('id').inTable('users').onDelete('RESTRICT');

    table.index('organization_id');
    table.index('recipient_id');
    table.index('status');
    table.index('priority');
    table.index('created_at');
    table.index(['recipient_id', 'status']);
    table.index(['organization_id', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notifications');
}



