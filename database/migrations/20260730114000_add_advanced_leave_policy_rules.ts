import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add advanced policy columns to leave_policy_assignments
  const hasCol = await knex.schema.hasColumn('leave_policy_assignments', 'max_backdated_days');
  if (!hasCol) {
    await knex.schema.alterTable('leave_policy_assignments', (table) => {
      table.integer('max_backdated_days').nullable().defaultTo(null);
      table.integer('max_future_days').nullable().defaultTo(null);
      table.integer('max_consecutive_days').nullable().defaultTo(null);
      table.boolean('notice_period_excluded').defaultTo(false);
      table.boolean('prefix_suffix_rule_enabled').defaultTo(false);
      table.integer('floating_holiday_quota').defaultTo(0);
    });
  }

  // 2. Create leave_policy_mappings table for the bulk rule engine
  const mappingExists = await knex.schema.hasTable('leave_policy_mappings');
  if (!mappingExists) {
    await knex.schema.createTable('leave_policy_mappings', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('leave_policy_id').unsigned().notNullable();
      table.bigInteger('role_id').unsigned().nullable();
      table.bigInteger('department_id').unsigned().nullable();
      table.bigInteger('designation_id').unsigned().nullable();
      table.string('employment_type', 100).nullable(); // e.g. permanent, contract, intern
      table.integer('priority').defaultTo(0);
      table.bigInteger('created_by').unsigned().notNullable();
      table.bigInteger('updated_by').unsigned().notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('organizations.id');
      table.foreign('leave_policy_id').references('leave_policies.id');
      table.foreign('created_by').references('users.id');
      table.foreign('updated_by').references('users.id');

      table.index('organization_id');
      table.index('leave_policy_id');
    });
  }

  // 3. Create optional_holiday_selections table for floating holidays selection pool
  const selectionsExists = await knex.schema.hasTable('optional_holiday_selections');
  if (!selectionsExists) {
    await knex.schema.createTable('optional_holiday_selections', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('employee_id').unsigned().notNullable();
      table.bigInteger('holiday_id').unsigned().notNullable();
      table.integer('year').notNullable();
      table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
      table.bigInteger('created_by').unsigned().notNullable();
      table.bigInteger('updated_by').unsigned().notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('organizations.id');
      table.foreign('employee_id').references('employees.id');
      table.foreign('holiday_id').references('holidays.id');
      table.foreign('created_by').references('users.id');
      table.foreign('updated_by').references('users.id');

      table.unique(['employee_id', 'holiday_id']);
      table.index('organization_id');
      table.index('employee_id');
      table.index('holiday_id');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('optional_holiday_selections');
  await knex.schema.dropTableIfExists('leave_policy_mappings');
  
  await knex.schema.alterTable('leave_policy_assignments', (table) => {
    table.dropColumn('max_backdated_days');
    table.dropColumn('max_future_days');
    table.dropColumn('max_consecutive_days');
    table.dropColumn('notice_period_excluded');
    table.dropColumn('prefix_suffix_rule_enabled');
    table.dropColumn('floating_holiday_quota');
  });
}
