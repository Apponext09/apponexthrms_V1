import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // eNPS snapshots - denormalized for fast trend queries
  const exists = await knex.schema.hasTable('enps_snapshots');
  if (exists) return;

  await knex.schema.createTable('enps_snapshots', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('organization_id').unsigned().notNullable().unsigned();
    table.bigInteger('survey_id').unsigned().notNullable();

    table.string('period_label', 100).notNullable(); // e.g., "Q1 2026", "Week 1", "January 2026"

    table.integer('promoters_count').unsigned().defaultTo(0); // Score 9-10
    table.integer('passives_count').unsigned().defaultTo(0); // Score 7-8
    table.integer('detractors_count').unsigned().defaultTo(0); // Score 0-6
    table.integer('response_count').unsigned().defaultTo(0);

    table.decimal('score', 5, 2).nullable(); // eNPS score (-100 to 100)
    table.decimal('participation_rate', 5, 2).nullable(); // Percentage (0-100)

    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('survey_id').references('id').inTable('surveys').onDelete('CASCADE');

    // Indexes
    table.index(['organization_id', 'created_at'], 'idx_enps_org_date');
    table.index('survey_id');
  });

  // Survey analytics cache - denormalized stats (refreshed daily)
  await knex.schema.createTable('survey_analytics_cache', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('survey_id').unsigned().notNullable().unsigned();
    table.enum('metric_type', [
      'completion_rate',
      'by_department',
      'by_branch',
      'by_gender',
      'by_role',
    ]).notNullable();

    table.json('metric_value').nullable(); // Flexible JSON for different metric types
    table.timestamp('cached_at').defaultTo(knex.fn.now());
    table.datetime('expires_at').nullable();

    // Foreign keys
    table.foreign('survey_id').references('id').inTable('surveys').onDelete('CASCADE');

    // Indexes
    table.index(['survey_id', 'metric_type'], 'idx_analytics_survey_metric');
  });

  // Survey reminders - scheduled reminder notifications
  await knex.schema.createTable('survey_reminders', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('survey_id').unsigned().notNullable().unsigned();
    table.bigInteger('recipient_employee_id').unsigned().nullable(); // Null = all eligible recipients

    table.datetime('scheduled_send_at').notNullable();
    table.datetime('sent_at').nullable();
    table.enum('status', ['pending', 'sent', 'failed']).defaultTo('pending');

    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('survey_id').references('id').inTable('surveys').onDelete('CASCADE');
    table.foreign('recipient_employee_id').references('id').inTable('employees').onDelete('CASCADE');

    // Indexes
    table.index('survey_id');
    table.index(['scheduled_send_at', 'status'], 'idx_reminders_pending');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('survey_reminders');
  await knex.schema.dropTableIfExists('survey_analytics_cache');
  await knex.schema.dropTableIfExists('enps_snapshots');
}


