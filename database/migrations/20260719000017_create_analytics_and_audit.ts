import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Engagement analytics - denormalized daily metrics (AI-ready)
  await knex.schema.createTable('engagement_analytics', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('organization_id').unsigned().notNullable().unsigned();
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

  // engagement_analytics creation is self-contained.
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('engagement_analytics');
}

