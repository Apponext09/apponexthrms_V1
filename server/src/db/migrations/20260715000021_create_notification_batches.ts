import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('notification_batches');
  if (exists) return;

  await knex.schema.createTable('notification_batches', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('batch_code', 100).notNullable();
    table.string('batch_name', 255).notNullable();
    table.text('description').nullable();
    table.integer('notification_count').defaultTo(0);
    table.integer('delivered_count').defaultTo(0);
    table.integer('failed_count').defaultTo(0);
    table.enum('status', ['pending', 'processing', 'completed', 'failed']).defaultTo('pending');
    table.timestamp('started_at').nullable();
    table.timestamp('completed_at').nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('users').onDelete('RESTRICT');
    table.foreign('updated_by').references('id').inTable('users').onDelete('RESTRICT');

    table.unique(['organization_id', 'batch_code']);
    table.index('organization_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_batches');
}

