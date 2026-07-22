import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Reactions table - for both posts and comments
  await knex.schema.createTable('feed_reactions', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('feed_post_id').unsigned().nullable();
    table.bigInteger('comment_id').unsigned().nullable(); // Reaction can be on post OR comment

    table.bigInteger('employee_id').unsigned().notNullable().unsigned();
    table.enum('reaction_type', ['like', 'heart', 'celebrate', 'clap', 'fire']).notNullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('feed_post_id').references('id').inTable('feed_posts').onDelete('CASCADE');
    table.foreign('comment_id').references('id').inTable('feed_post_comments').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('employees').onDelete('CASCADE');

    // Unique constraints: one reaction type per employee per entity
    table.unique(['feed_post_id', 'employee_id', 'reaction_type'], 'uq_post_reaction_employee');
    table.unique(['comment_id', 'employee_id', 'reaction_type'], 'uq_comment_reaction_employee');

    // Indexes
    table.index('feed_post_id');
    table.index('comment_id');
    table.index('employee_id');
  });

  // Bookmarks table - user saved posts
  await knex.schema.createTable('feed_bookmarks', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('feed_post_id').notNullable().unsigned();
    table.bigInteger('employee_id').unsigned().notNullable().unsigned();

    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('feed_post_id').references('id').inTable('feed_posts').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('employees').onDelete('CASCADE');

    // Unique constraint
    table.unique(['feed_post_id', 'employee_id'], 'uq_feed_bookmark_employee');

    // Indexes
    table.index('feed_post_id');
    table.index(['employee_id', 'created_at'], 'idx_bookmarks_employee_date');
  });

  // Mentions table - @employee mentions
  await knex.schema.createTable('feed_mentions', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('feed_post_id').unsigned().nullable();
    table.bigInteger('comment_id').unsigned().nullable();
    table.bigInteger('mentioned_employee_id').notNullable().unsigned();

    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('feed_post_id').references('id').inTable('feed_posts').onDelete('CASCADE');
    table.foreign('comment_id').references('id').inTable('feed_post_comments').onDelete('CASCADE');
    table.foreign('mentioned_employee_id').references('id').inTable('employees').onDelete('CASCADE');

    // Indexes
    table.index('feed_post_id');
    table.index('comment_id');
    table.index(['mentioned_employee_id', 'created_at'], 'idx_mentions_employee_date');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('feed_mentions');
  await knex.schema.dropTableIfExists('feed_bookmarks');
  await knex.schema.dropTableIfExists('feed_reactions');
}


