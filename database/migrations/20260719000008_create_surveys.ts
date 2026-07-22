import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('surveys', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable().unsigned();

    table.string('title', 500).notNullable();
    table.text('description').nullable();

    table.enum('survey_type', ['standard', 'pulse', 'enps']).notNullable().defaultTo('standard');
    table.enum('status', ['draft', 'scheduled', 'active', 'closed', 'archived']).notNullable().defaultTo('draft');

    table.boolean('is_anonymous').defaultTo(false);

    table.enum('visibility_level', ['public', 'department', 'team', 'branch', 'private'])
      .notNullable()
      .defaultTo('public');
    table.json('visible_to_department_ids').nullable();
    table.json('visible_to_team_ids').nullable();
    table.json('visible_to_branch_ids').nullable();
    table.json('visible_to_role_ids').nullable();

    table.datetime('starts_at').nullable();
    table.datetime('ends_at').nullable();
    table.datetime('scheduled_at').nullable(); // For scheduled surveys

    table.enum('recurrence_pattern', ['once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'custom'])
      .defaultTo('once');
    table.string('recurrence_custom_days', 255).nullable(); // e.g., "1,15" for 1st and 15th
    table.datetime('recurrence_end_date').nullable();

    table.boolean('send_reminders').defaultTo(false);
    table.enum('reminder_frequency', ['daily', '2_days', '3_days', 'weekly']).nullable();

    table.boolean('show_progress_bar').defaultTo(true);
    table.boolean('randomize_questions').defaultTo(false);
    table.boolean('show_branching_logic').defaultTo(false);

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    // Denormalized stats
    table.integer('total_responses').unsigned().defaultTo(0);
    table.integer('completed_responses').unsigned().defaultTo(0);

    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('users').onDelete('RESTRICT');
    table.foreign('updated_by').references('id').inTable('users').onDelete('RESTRICT');

    // Indexes
    table.index('organization_id');
    table.index(['organization_id', 'status', 'starts_at'], 'idx_surveys_org_status_date');
    table.index('survey_type');
    table.index('scheduled_at');
    table.index(['status', 'ends_at'], 'idx_surveys_active');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('surveys');
}


