import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('feed_posts', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable().unsigned();
    table.bigInteger('author_id').unsigned().nullable(); // Nullable for system posts (birthdays, announcements)
    table.enum('post_type', [
      'user_post',
      'announcement',
      'recognition',
      'event',
      'poll',
      'suggestion',
      'birthday',
      'work_anniversary',
      'promotion',
      'service_milestone',
    ]).notNullable().defaultTo('user_post');

    table.text('content').nullable(); // Post text
    table.json('rich_text_json').nullable(); // For rich text editor state

    table.enum('visibility_level', ['public', 'department', 'team', 'branch', 'private'])
      .notNullable()
      .defaultTo('public');
    table.json('visible_to_department_ids').nullable(); // JSON array of department IDs
    table.json('visible_to_team_ids').nullable(); // JSON array of team IDs
    table.json('visible_to_branch_ids').nullable(); // JSON array of branch IDs
    table.json('visible_to_role_ids').nullable(); // JSON array of role IDs

    table.boolean('is_pinned').defaultTo(false);
    table.integer('pin_priority').unsigned().nullable(); // Order for pinned posts
    table.boolean('is_trending').defaultTo(false);
    table.decimal('engagement_score', 10, 2).defaultTo(0); // Denormalized for sorting

    table.datetime('scheduled_publish_at').nullable();
    table.datetime('published_at').nullable();
    table.datetime('expires_at').nullable();

    table.boolean('allow_comments').defaultTo(true);

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    // Denormalized counts for performance
    table.integer('like_count').unsigned().defaultTo(0);
    table.integer('comment_count').unsigned().defaultTo(0);

    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('author_id').references('id').inTable('employees').onDelete('SET NULL');
    table.foreign('created_by').references('id').inTable('users').onDelete('RESTRICT');
    table.foreign('updated_by').references('id').inTable('users').onDelete('RESTRICT');

    // Indexes
    table.index('organization_id');
    table.index(['organization_id', 'created_at'], 'idx_feed_posts_org_date');
    table.index(['is_pinned', 'pin_priority', 'created_at'], 'idx_feed_posts_pinned');
    table.index('post_type');
    table.index('author_id');
    table.index(['engagement_score', 'created_at'], 'idx_feed_posts_trending');
    table.index('is_trending');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('feed_posts');
}

