import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('shift_templates', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('shift_name', 100).notNullable();
    table.string('shift_code', 50).notNullable();
    table.enum('shift_type', ['fixed', 'flexible', 'rotational', 'night', 'split']).defaultTo('fixed');
    table.time('start_time').nullable();
    table.time('end_time').nullable();
    table.decimal('duration_hours', 4, 2);
    table.integer('grace_period_minutes').defaultTo(0);
    table.integer('break_duration_minutes').defaultTo(60);
    table.boolean('is_night_shift').defaultTo(false);
    table.boolean('is_flexible').defaultTo(false);
    table.time('flexible_start_range_start').nullable();
    table.time('flexible_start_range_end').nullable();
    table.string('color', 7).defaultTo('#3B82F6');
    table.text('description').nullable();
    table.boolean('is_default').defaultTo(false);
    table.enum('status', ['active', 'inactive']).defaultTo('active');

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.unique(['organization_id', 'shift_code']);
    table.index('organization_id');
    table.index('status');
    table.index('shift_type');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('shift_templates');
}




