import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('feed_polls');
  if (exists) return;

  await knex.schema.createTable('feed_polls', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('feed_post_id').unsigned().notNullable().unsigned();

    table.string('question', 500).notNullable();
    table.boolean('allows_multiple').defaultTo(false);
    table.boolean('is_anonymous').defaultTo(false);

    table.bigInteger('created_by').unsigned().notNullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.datetime('expires_at').nullable();
    table.timestamp('deleted_at').nullable();

    // Foreign keys
    table.foreign('feed_post_id').references('id').inTable('feed_posts').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('users').onDelete('RESTRICT');

    // Indexes
    table.index('feed_post_id');
    table.index(['expires_at', 'created_at'], 'idx_feed_polls_expiry');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('feed_polls');
}

