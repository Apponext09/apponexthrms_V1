import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Engagement analytics - denormalized daily metrics (AI-ready)
  await knex.schema.createTable('engagement_analytics', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('organization_id').notNullable().unsigned();
    table.bigInteger('employee_id').unsigned().nullable(); // Null = org-wide aggregate

    table.date('period_date').notNullable();

    // Engagement counts
    table.integer('posts_count').unsigned().defaultTo(0);
    table.integer('comments_count').unsigned().defaultTo(0);
    table.integer('reactions_count').unsigned().defaultTo(0);
    table.integer('bookmarks_count').unsigned().defaultTo(0);

    // Recognition & surveys
    table.integer('recognition_given').unsigned().defaultTo(0);
    table.integer('recognition_received').unsigned().defaultTo(0);
    table.integer('surveys_completed').unsigned().defaultTo(0);
    table.decimal('surveys_avg_score', 5, 2).nullable();

    // Suggestion status summary (JSON)
    table.json('suggestion_status').nullable(); // {submitted: 5, approved: 2, implemented: 1}

    // Engagement score (0-100)
    table.decimal('engagement_score', 5, 2).defaultTo(0);

    // AI-ready fields (for future ML models)
    table.decimal('sentiment_score', 5, 2).nullable(); // -1 to 1 scale
    table.decimal('attrition_risk_score', 5, 2).nullable(); // 0-100, higher = more risk

    table.datetime('last_active_date').nullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('employees').onDelete('CASCADE');

    // Indexes
    table.index(['organization_id', 'period_date'], 'idx_analytics_org_date');
    table.index(['engagement_score', 'period_date'], 'idx_analytics_engagement');
    table.index(['attrition_risk_score', 'period_date'], 'idx_analytics_attrition');
    table.index(['employee_id', 'period_date'], 'idx_analytics_employee_date');
  });

  // Audit logs - complete compliance trail
  await knex.schema.createTable('audit_logs', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('organization_id').notNullable().unsigned();
    table.bigInteger('user_id').unsigned().nullable();

    table.enum('action', [
      'create',
      'update',
      'delete',
      'publish',
      'archive',
      'award_badge',
      'vote',
      'react',
      'comment',
      'respond_suggestion',
      'export',
    ]).notNullable();

    table.enum('entity_type', [
      'feed_post',
      'survey',
      'suggestion',
      'badge',
      'milestone',
      'event',
      'poll',
      'comment',
    ]).notNullable();

    table.bigInteger('entity_id').notNullable();

    // JSON: before and after state for updates
    table.json('changes_json').nullable();

    // Network info
    table.string('ip_address', 50).nullable();
    table.string('user_agent', 500).nullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('SET NULL');

    // Indexes
    table.index(['organization_id', 'created_at'], 'idx_audit_org_date');
    table.index(['entity_type', 'entity_id'], 'idx_audit_entity');
    table.index('user_id');
    table.index('action');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('engagement_analytics');
}

