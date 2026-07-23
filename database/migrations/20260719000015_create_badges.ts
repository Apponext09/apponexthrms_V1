import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Badge definitions/catalog
  await knex.schema.createTable('badges', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable().unsigned();

    table.string('name', 100).notNullable();
    table.text('description').nullable();

    table.string('icon_url', 500).notNullable();
    table.string('color_hex', 7).defaultTo('#000000');
    table.string('background_color_hex', 7).defaultTo('#FFFFFF');

    table.enum('category', [
      'performance',
      'attendance',
      'innovation',
      'leadership',
      'learning',
      'culture',
      'service',
      'milestone',
      'custom',
    ]).notNullable();

    table.integer('points_value').unsigned().defaultTo(0);
    table.enum('level', ['bronze', 'silver', 'gold', 'platinum']).defaultTo('bronze');

    table.integer('expiry_days').unsigned().nullable(); // Null = doesn't expire
    table.boolean('requires_certificate').defaultTo(false);

    table.bigInteger('created_by').unsigned().notNullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('users').onDelete('RESTRICT');

    // Indexes
    table.index(['organization_id', 'category'], 'idx_badges_org_category');
    table.index('level');
  });

  // Employee badge awards
  await knex.schema.createTable('employee_badges', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('employee_id').unsigned().notNullable().unsigned();
<<<<<<< HEAD
    table.bigInteger('badge_id').notNullable().unsigned();
=======
    table.bigInteger('badge_id').unsigned().notNullable().unsigned();
>>>>>>> 012d7ba9af5c7c9cad1fc8857c4c53d5461f7f76

    table.bigInteger('awarded_by').unsigned().notNullable(); // User who awarded
    table.datetime('awarded_at').notNullable();
    table.date('earned_date').notNullable(); // When badge was earned
    table.datetime('expires_at').nullable(); // Based on badge.expiry_days

    table.string('certificate_url', 500).nullable();
    table.boolean('is_visible_on_profile').defaultTo(true);

    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('employee_id').references('id').inTable('employees').onDelete('CASCADE');
    table.foreign('badge_id').references('id').inTable('badges').onDelete('CASCADE');
    table.foreign('awarded_by').references('id').inTable('users').onDelete('RESTRICT');

    // Indexes
    table.index(['employee_id', 'awarded_at'], 'idx_employee_badges_date');
    table.index('badge_id');
    table.index('is_visible_on_profile');
  });

  // Badge earning criteria - how badges are earned
  await knex.schema.createTable('badge_criteria', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('badge_id').unsigned().notNullable().unsigned();

    table.enum('criteria_type', [
      'manual',
      'performance_score',
      'attendance_rate',
      'recognition_points',
      'survey_score',
      'custom_rule',
    ]).notNullable();

    table.decimal('threshold_value', 10, 2).nullable();
    table.text('description').nullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('badge_id').references('id').inTable('badges').onDelete('CASCADE');

    // Indexes
    table.index('badge_id');
    table.index('criteria_type');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('badge_criteria');
  await knex.schema.dropTableIfExists('employee_badges');
  await knex.schema.dropTableIfExists('badges');
}


