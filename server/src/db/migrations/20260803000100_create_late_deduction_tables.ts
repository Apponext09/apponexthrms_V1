import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── late_deduction_policies ──
  const hasPolicies = await knex.schema.hasTable('late_deduction_policies');
  if (!hasPolicies) {
    await knex.schema.createTable('late_deduction_policies', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.string('name', 200).notNullable();
      table.string('policy_type', 50).defaultTo('Late Coming'); // 'Late Coming' | 'Early Going'
      table.integer('first_deduction_on').defaultTo(3);
      table.integer('buffer_allowed').defaultTo(15);
      table.integer('no_buffer_allowed').defaultTo(0);
      table.string('deduct_type', 50).defaultTo('Leave'); // 'Leave' | 'Salary'
      table.decimal('deduction_unit', 5, 2).defaultTo(1.0);
      table.decimal('after_deduction_amount', 5, 2).defaultTo(0.5);
      table.integer('after_deduction_every').defaultTo(1);
      table.text('deduction_sequence').nullable(); // JSON array e.g. ["LWP","Paid leaves","Privilege Leave","Salary"]
      table.text('locations').nullable();           // JSON array of location IDs
      table.text('departments').nullable();          // JSON array of department IDs
      table.text('grades').nullable();               // JSON array of grade strings
      table.text('shifts').nullable();               // JSON array of shift IDs
      table.text('employee_statuses').nullable();    // JSON array of status strings
      table.string('status', 50).defaultTo('active');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
 
      table.foreign('organization_id').references('organizations.id');
      table.index('organization_id');
      table.index('status');
    });
  }

  // ── late_updations (Late Auto-Deduction rules) ──
  const hasUpdations = await knex.schema.hasTable('late_updations');
  if (!hasUpdations) {
    await knex.schema.createTable('late_updations', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.string('name', 200).notNullable();
      table.string('late_coming_after', 10).defaultTo('09:30'); // HH:MM threshold
      table.string('update_for', 50).defaultTo('Half Day');     // 'Half Day' | 'No Pay'
      table.boolean('auto_apply_leave').defaultTo(false);
      table.text('locations').nullable();           // JSON array
      table.text('departments').nullable();          // JSON array
      table.text('grades').nullable();               // JSON array
      table.text('shifts').nullable();               // JSON array
      table.text('employee_statuses').nullable();    // JSON array
      table.string('status', 50).defaultTo('active');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id');
      table.index('organization_id');
      table.index('status');
    });
  }

  // ── late_auto_deduction_logs ──
  const hasLogs = await knex.schema.hasTable('late_auto_deduction_logs');
  if (!hasLogs) {
    await knex.schema.createTable('late_auto_deduction_logs', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.string('month', 10).notNullable();       // e.g. '2026-07'
      table.integer('evaluated').defaultTo(0);
      table.decimal('deducted_leaves', 5, 2).defaultTo(0.0);
      table.string('status', 50).defaultTo('Success');
      table.timestamp('execution_time').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id');
      table.index('organization_id');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('late_auto_deduction_logs');
  await knex.schema.dropTableIfExists('late_updations');
  await knex.schema.dropTableIfExists('late_deduction_policies');
}
