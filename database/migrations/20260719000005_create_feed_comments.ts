import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('feed_post_comments', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('feed_post_id').unsigned().notNullable().unsigned();
    table.bigInteger('parent_comment_id').unsigned().nullable(); // For nested replies

    table.bigInteger('author_id').unsigned().notNullable().unsigned();
    table.text('comment_text').notNullable();
    table.json('rich_text_json').nullable(); // For rich formatting in future

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    // Denormalized counts
    table.integer('reply_count').unsigned().defaultTo(0);
    table.integer('like_count').unsigned().defaultTo(0);

    // Foreign keys
    table.foreign('feed_post_id').references('id').inTable('feed_posts').onDelete('CASCADE');
    table.foreign('parent_comment_id').references('id').inTable('feed_post_comments').onDelete('CASCADE');
    table.foreign('author_id').references('id').inTable('employees').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('users').onDelete('RESTRICT');
    table.foreign('updated_by').references('id').inTable('users').onDelete('RESTRICT');

    // Indexes
    table.index('feed_post_id');
    table.index(['feed_post_id', 'parent_comment_id'], 'idx_feed_comments_thread');
    table.index('author_id');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('feed_post_comments');
}

