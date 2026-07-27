import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Milestones - birthdays, anniversaries, service milestones
  const exists = await knex.schema.hasTable('milestones');
  if (exists) return;

  await knex.schema.createTable('milestones', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable().unsigned();

    table.bigInteger('employee_id').unsigned().notNullable().unsigned();

    table.enum('milestone_type', [
      'birthday',
      'work_anniversary',
      'joining_anniversary',
      'promotion_anniversary',
      'service_1yr',
      'service_3yr',
      'service_5yr',
      'service_10yr',
      'service_15yr',
      'service_20yr',
      'custom',
    ]).notNullable();

    table.date('milestone_date').notNullable();
    table.bigInteger('feed_post_id').unsigned().nullable(); // Reference to auto-created post

    table.datetime('notification_sent_at').nullable();
    table.json('metadata_json').nullable(); // Custom data for milestone

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('employees').onDelete('CASCADE');
    table.foreign('feed_post_id').references('id').inTable('feed_posts').onDelete('SET NULL');

    // Indexes
    table.index(['organization_id', 'milestone_type'], 'idx_milestones_org_type');
    table.index(['employee_id', 'milestone_date'], 'idx_milestones_employee_date');
    table.index('milestone_date');
  });

  // Events - company/team events
  await knex.schema.createTable('events', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable().unsigned();

    table.string('title', 500).notNullable();
    table.text('description').nullable();

    table.enum('event_type', [
      'company_event',
      'team_meeting',
      'announcement',
      'celebration',
      'training',
    ]).notNullable();

    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.time('start_time').nullable();
    table.time('end_time').nullable();

    table.string('location', 255).nullable();

    table.bigInteger('organizer_id').unsigned().notNullable();
    table.integer('max_attendees').unsigned().nullable();

    table.bigInteger('feed_post_id').unsigned().nullable(); // Reference to event post

    table.bigInteger('created_by').unsigned().notNullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('organizer_id').references('id').inTable('employees').onDelete('CASCADE');
    table.foreign('feed_post_id').references('id').inTable('feed_posts').onDelete('SET NULL');
    table.foreign('created_by').references('id').inTable('users').onDelete('RESTRICT');

    // Indexes
    table.index(['organization_id', 'start_date'], 'idx_events_org_date');
    table.index('event_type');
  });

  // Event attendees - RSVP tracking
  await knex.schema.createTable('event_attendees', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('event_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable().unsigned();

    table.enum('status', ['invited', 'accepted', 'declined', 'interested']).defaultTo('invited');
    table.datetime('response_date').nullable();

    // Foreign keys
    table.foreign('event_id').references('id').inTable('events').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('employees').onDelete('CASCADE');

    // Unique constraint
    table.unique(['event_id', 'employee_id'], 'uq_event_attendee');

    // Indexes
    table.index('event_id');
    table.index(['employee_id', 'status'], 'idx_attendee_employee_status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('event_attendees');
  await knex.schema.dropTableIfExists('events');
  await knex.schema.dropTableIfExists('milestones');
}


