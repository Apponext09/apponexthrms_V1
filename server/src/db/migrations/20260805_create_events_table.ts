import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('events');
  if (!hasTable) {
    await knex.schema.createTable('events', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.string('title', 255).notNullable();
      table.text('description', 'longtext').nullable();
      table.string('venue', 255).nullable();
      table.string('event_type', 255).nullable();
      table.date('start_date').nullable();
      table.date('end_date').nullable();
      table.string('start_time', 5).nullable();
      table.string('end_time', 5).nullable();
      table.integer('display_days_before').defaultTo(0);
      table.boolean('require_participation').defaultTo(false);
      table.boolean('allow_comments').defaultTo(false);
      table.boolean('set_reminder').defaultTo(false);

      // JSON stringified audience targeting arrays
      table.text('company_ids', 'longtext').nullable();
      table.text('location_ids', 'longtext').nullable();
      table.text('department_ids', 'longtext').nullable();
      table.text('shift_ids', 'longtext').nullable();
      table.text('grade_ids', 'longtext').nullable();
      table.text('employment_types', 'longtext').nullable();
      table.text('employee_status_ids', 'longtext').nullable();
      table.string('gender', 10).defaultTo('All');

      table.boolean('is_active').defaultTo(true);
      table.string('status', 20).defaultTo('Active');
      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.index(['organization_id'], 'idx_events_org');
      table.index(['status'], 'idx_events_status');
    });
  } else {
    // Make sure legacy organizer_id column is NULLABLE to prevent insert failures
    const hasOrganizer = await knex.schema.hasColumn('events', 'organizer_id');
    if (hasOrganizer) {
      try {
        await knex.raw('ALTER TABLE events MODIFY organizer_id BIGINT UNSIGNED NULL DEFAULT NULL');
      } catch (_) {}
    }

    // Ensure event_type is VARCHAR(255) instead of restricted enum
    try {
      await knex.schema.alterTable('events', (t) => {
        t.string('event_type', 255).alter();
      });
    } catch {
      // Ignore if alter fails on specific MySQL dialect options
    }

    // Individually check and add missing columns
    const columns = [
      { name: 'uuid', add: (t: Knex.CreateTableBuilder) => t.string('uuid', 36).nullable() },
      { name: 'venue', add: (t: Knex.CreateTableBuilder) => t.string('venue', 255).nullable() },
      { name: 'start_date', add: (t: Knex.CreateTableBuilder) => t.date('start_date').nullable() },
      { name: 'end_date', add: (t: Knex.CreateTableBuilder) => t.date('end_date').nullable() },
      { name: 'start_time', add: (t: Knex.CreateTableBuilder) => t.string('start_time', 5).nullable() },
      { name: 'end_time', add: (t: Knex.CreateTableBuilder) => t.string('end_time', 5).nullable() },
      { name: 'display_days_before', add: (t: Knex.CreateTableBuilder) => t.integer('display_days_before').defaultTo(0) },
      { name: 'require_participation', add: (t: Knex.CreateTableBuilder) => t.boolean('require_participation').defaultTo(false) },
      { name: 'allow_comments', add: (t: Knex.CreateTableBuilder) => t.boolean('allow_comments').defaultTo(false) },
      { name: 'set_reminder', add: (t: Knex.CreateTableBuilder) => t.boolean('set_reminder').defaultTo(false) },
      { name: 'company_ids', add: (t: Knex.CreateTableBuilder) => t.text('company_ids', 'longtext').nullable() },
      { name: 'location_ids', add: (t: Knex.CreateTableBuilder) => t.text('location_ids', 'longtext').nullable() },
      { name: 'department_ids', add: (t: Knex.CreateTableBuilder) => t.text('department_ids', 'longtext').nullable() },
      { name: 'shift_ids', add: (t: Knex.CreateTableBuilder) => t.text('shift_ids', 'longtext').nullable() },
      { name: 'grade_ids', add: (t: Knex.CreateTableBuilder) => t.text('grade_ids', 'longtext').nullable() },
      { name: 'employment_types', add: (t: Knex.CreateTableBuilder) => t.text('employment_types', 'longtext').nullable() },
      { name: 'employee_status_ids', add: (t: Knex.CreateTableBuilder) => t.text('employee_status_ids', 'longtext').nullable() },
      { name: 'gender', add: (t: Knex.CreateTableBuilder) => t.string('gender', 10).defaultTo('All') },
      { name: 'is_active', add: (t: Knex.CreateTableBuilder) => t.boolean('is_active').defaultTo(true) },
      { name: 'status', add: (t: Knex.CreateTableBuilder) => t.string('status', 20).defaultTo('Active') },
      { name: 'created_by', add: (t: Knex.CreateTableBuilder) => t.bigInteger('created_by').unsigned().nullable() },
      { name: 'updated_by', add: (t: Knex.CreateTableBuilder) => t.bigInteger('updated_by').unsigned().nullable() },
      { name: 'deleted_at', add: (t: Knex.CreateTableBuilder) => t.timestamp('deleted_at').nullable() },
    ];

    for (const col of columns) {
      const hasCol = await knex.schema.hasColumn('events', col.name);
      if (!hasCol) {
        await knex.schema.alterTable('events', (t) => {
          col.add(t);
        });
      }
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('events');
}
