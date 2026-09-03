import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. ALTER holiday_calendars table
  const hasCalTable = await knex.schema.hasTable('holiday_calendars');
  if (hasCalTable) {
    // Add columns if they do not exist
    const hasCalendarName = await knex.schema.hasColumn('holiday_calendars', 'calendar_name');
    const hasCalendarYear = await knex.schema.hasColumn('holiday_calendars', 'calendar_year');
    const hasCompanyId = await knex.schema.hasColumn('holiday_calendars', 'company_id');
    const hasRegionId = await knex.schema.hasColumn('holiday_calendars', 'region_id');
    const hasLocationId = await knex.schema.hasColumn('holiday_calendars', 'location_id');

    await knex.schema.alterTable('holiday_calendars', (table) => {
      if (!hasCalendarName) {
        table.string('calendar_name', 255).nullable();
      }
      if (!hasCalendarYear) {
        table.integer('calendar_year').nullable();
      }
      if (!hasCompanyId) {
        table.bigInteger('company_id').unsigned().nullable();
      }
      if (!hasRegionId) {
        table.bigInteger('region_id').unsigned().nullable();
      }
      if (!hasLocationId) {
        table.bigInteger('location_id').unsigned().nullable();
      }
    });

    // Alter status column to varchar(50) so it supports Draft / Published / Archived
    try {
      await knex.raw("ALTER TABLE `holiday_calendars` MODIFY COLUMN `status` VARCHAR(50) DEFAULT 'Draft'");
    } catch (e) {
      console.warn('Could not alter status column type on holiday_calendars:', e);
    }

    // Populate calendar_name and calendar_year from existing name and year if empty
    try {
      await knex.raw('UPDATE `holiday_calendars` SET `calendar_name` = `name` WHERE `calendar_name` IS NULL AND `name` IS NOT NULL');
      await knex.raw('UPDATE `holiday_calendars` SET `calendar_year` = `year` WHERE `calendar_year` IS NULL AND `year` IS NOT NULL');
      await knex.raw('UPDATE `holiday_calendars` SET `location_id` = `applicable_location_id` WHERE `location_id` IS NULL AND `applicable_location_id` IS NOT NULL');
    } catch (e) {
      console.warn('Could not sync existing holiday_calendars data:', e);
    }
  }

  // 2. ALTER holidays table
  const hasHolidaysTable = await knex.schema.hasTable('holidays');
  if (hasHolidaysTable) {
    const hasCalendarId = await knex.schema.hasColumn('holidays', 'calendar_id');
    await knex.schema.alterTable('holidays', (table) => {
      if (!hasCalendarId) {
        table.bigInteger('calendar_id').unsigned().nullable();
      }
    });

    // Modify holiday_type column to support string values
    try {
      await knex.raw("ALTER TABLE `holidays` MODIFY COLUMN `holiday_type` VARCHAR(50) DEFAULT 'National'");
    } catch (e) {
      console.warn('Could not alter holiday_type column on holidays:', e);
    }

    // Sync calendar_id from holiday_calendar_id
    try {
      await knex.raw('UPDATE `holidays` SET `calendar_id` = `holiday_calendar_id` WHERE `calendar_id` IS NULL AND `holiday_calendar_id` IS NOT NULL');
    } catch (e) {
      console.warn('Could not sync calendar_id on holidays:', e);
    }
  }

  // 3. CREATE weekly_off_rules table
  const hasWeeklyOff = await knex.schema.hasTable('weekly_off_rules');
  if (!hasWeeklyOff) {
    await knex.schema.createTable('weekly_off_rules', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').notNullable().unique();
      table.bigInteger('organization_id').unsigned().nullable();
      table.bigInteger('calendar_id').unsigned().notNullable();
      table.string('week_day', 20).notNullable(); // Mon, Tue, Wed, Thu, Fri, Sat, Sun
      table.string('off_type', 20).notNullable().defaultTo('Full Day'); // Full Day, Half Day
      table.boolean('is_alternate').defaultTo(false);
      table.string('alternate_weeks', 50).nullable(); // e.g. "2,4"
      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('calendar_id').references('holiday_calendars.id').onDelete('CASCADE');
      table.index('calendar_id');
      table.index('week_day');
    });
  }

  // 4. CREATE calendar_assignments table
  const hasAssignments = await knex.schema.hasTable('calendar_assignments');
  if (!hasAssignments) {
    await knex.schema.createTable('calendar_assignments', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').notNullable().unique();
      table.bigInteger('organization_id').unsigned().nullable();
      table.bigInteger('calendar_id').unsigned().notNullable();
      table.bigInteger('company_id').unsigned().nullable();
      table.bigInteger('location_id').unsigned().nullable();
      table.bigInteger('department_id').unsigned().nullable();
      table.bigInteger('employee_group_id').unsigned().nullable();
      table.timestamp('assigned_at').defaultTo(knex.fn.now());
      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('calendar_id').references('holiday_calendars.id').onDelete('CASCADE');
      table.index('calendar_id');
      table.index('company_id');
      table.index('location_id');
      table.index('department_id');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('calendar_assignments');
  await knex.schema.dropTableIfExists('weekly_off_rules');

  const hasHolidaysTable = await knex.schema.hasTable('holidays');
  if (hasHolidaysTable) {
    const hasCalendarId = await knex.schema.hasColumn('holidays', 'calendar_id');
    if (hasCalendarId) {
      await knex.schema.alterTable('holidays', (table) => {
        table.dropColumn('calendar_id');
      });
    }
  }

  const hasCalTable = await knex.schema.hasTable('holiday_calendars');
  if (hasCalTable) {
    await knex.schema.alterTable('holiday_calendars', (table) => {
      table.dropColumn('calendar_name');
      table.dropColumn('calendar_year');
      table.dropColumn('company_id');
      table.dropColumn('region_id');
      table.dropColumn('location_id');
    });
  }
}
