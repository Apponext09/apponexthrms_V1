import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Hashtags catalog
  await knex.schema.createTable('feed_hashtags', (table) => {
    table.bigIncrements('id').primary();
    table.string('tag_text', 100).notNullable(); // Lowercase, trimmed
    table.bigInteger('organization_id').unsigned().notNullable().unsigned();

    table.integer('usage_count').unsigned().defaultTo(0);
    table.datetime('last_used_at').nullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');

    // Unique constraint
    table.unique(['organization_id', 'tag_text'], 'uq_hashtag_org_text');

    // Indexes
    table.index('organization_id');
    table.index(['usage_count', 'last_used_at'], 'idx_hashtags_trending');
  });

  // Junction table - posts to hashtags (many-to-many)
  await knex.schema.createTable('feed_post_hashtags', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('feed_post_id').unsigned().notNullable().unsigned();
    table.bigInteger('hashtag_id').unsigned().notNullable().unsigned();

    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('feed_post_id').references('id').inTable('feed_posts').onDelete('CASCADE');
    table.foreign('hashtag_id').references('id').inTable('feed_hashtags').onDelete('CASCADE');

    // Unique constraint
    table.unique(['feed_post_id', 'hashtag_id'], 'uq_post_hashtag');

    // Indexes
    table.index('feed_post_id');
    table.index('hashtag_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('feed_post_hashtags');
  await knex.schema.dropTableIfExists('feed_hashtags');
}


