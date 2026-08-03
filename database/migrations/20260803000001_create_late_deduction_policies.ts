import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Create late_deduction_policies table
  const hasPolicyTable = await knex.schema.hasTable('late_deduction_policies');
  if (!hasPolicyTable) {
    await knex.schema.createTable('late_deduction_policies', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.string('name', 255).notNullable();
      table.string('policy_type', 50).defaultTo('Late Coming');
      table.integer('first_deduction_on').defaultTo(3);
      table.integer('buffer_allowed').defaultTo(15);
      table.integer('no_buffer_allowed').defaultTo(0);
      table.string('deduct_type', 50).defaultTo('Leave'); // 'Leave' or 'Salary'
      table.decimal('deduction_unit', 5, 2).defaultTo(1.0);
      table.decimal('after_deduction_amount', 5, 2).defaultTo(0.5);
      table.integer('after_deduction_every').defaultTo(1);
      table.json('deduction_sequence').nullable(); // JSON array e.g. ["LWP", "Paid leaves", "Privilege Leave", "Salary"]
      table.json('locations').nullable(); // JSON array of location IDs
      table.json('departments').nullable(); // JSON array of department IDs
      table.json('grades').nullable(); // JSON array of grade strings
      table.json('shifts').nullable(); // JSON array of shift IDs
      table.json('employee_statuses').nullable(); // JSON array of employee status strings
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id').onDelete('CASCADE');
      table.index(['organization_id', 'is_active']);
    });
  }

  // 2. Create late_auto_deduction_logs table
  const hasLogsTable = await knex.schema.hasTable('late_auto_deduction_logs');
  if (!hasLogsTable) {
    await knex.schema.createTable('late_auto_deduction_logs', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.string('month', 20).notNullable();
      table.integer('evaluated').defaultTo(0);
      table.decimal('deducted_leaves', 5, 2).defaultTo(0.0);
      table.string('status', 50).defaultTo('Success');
      table.timestamp('execution_time').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id').onDelete('CASCADE');
      table.index(['organization_id', 'month']);
    });
  }

  // 3. Create late_updations table
  const hasUpdationsTable = await knex.schema.hasTable('late_updations');
  if (!hasUpdationsTable) {
    await knex.schema.createTable('late_updations', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.string('name', 255).notNullable();
      table.string('late_coming_after', 10).defaultTo('09:30');
      table.string('update_for', 50).defaultTo('Half Day'); // 'Half Day', 'No Pay'
      table.boolean('auto_apply_leave').defaultTo(false);
      table.json('locations').nullable();
      table.json('departments').nullable();
      table.json('grades').nullable();
      table.json('shifts').nullable();
      table.json('employee_statuses').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id').onDelete('CASCADE');
      table.index(['organization_id', 'is_active']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('late_updations');
  await knex.schema.dropTableIfExists('late_auto_deduction_logs');
  await knex.schema.dropTableIfExists('late_deduction_policies');
}
