import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('notification_events');
  if (exists) return;

  await knex.schema.createTable('notification_events', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('event_code', 100).notNullable();
    table.string('event_name', 255).notNullable();
    table.text('event_description').nullable();
    table.bigInteger('default_template_id').unsigned().nullable();
    table.boolean('is_enabled').defaultTo(true);
    table.integer('retry_count').defaultTo(3);
    table.integer('retry_interval_minutes').defaultTo(5);
    table.integer('max_queue_delay_hours').defaultTo(1);
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('default_template_id').references('id').inTable('notification_templates').onDelete('SET NULL');
    table.foreign('created_by').references('id').inTable('users').onDelete('RESTRICT');
    table.foreign('updated_by').references('id').inTable('users').onDelete('RESTRICT');

    table.unique(['organization_id', 'event_code']);
    table.index('organization_id');
    table.index('is_enabled');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_events');
}

