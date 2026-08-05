import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('employee_statuses');
  if (!hasTable) {
    await knex.schema.createTable('employee_statuses', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.string('name', 150).notNullable();
      table.boolean('is_probation_status').defaultTo(false);
      table.integer('probation_period_value').nullable();
      table.string('probation_period_unit', 50).nullable();
      table.boolean('notify_on_completion').defaultTo(false);
      table.boolean('is_confirmation_status').defaultTo(false);
      table.boolean('is_resignation_status').defaultTo(false);
      table.boolean('inactive_on_status_change').defaultTo(false);
      table.string('status_color', 20).nullable();
      table.enum('status', ['active', 'inactive']).defaultTo('active');
      
      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('organizations.id');
      table.index('organization_id');
      table.index('status');
    });
  }

  // Alter the employees table to support dynamic strings/IDs instead of ENUM for status
  const hasEmployees = await knex.schema.hasTable('employees');
  if (hasEmployees) {
    // In MySQL, to change an ENUM to VARCHAR without data loss:
    await knex.raw("ALTER TABLE employees MODIFY status VARCHAR(100) NULL DEFAULT 'active'");
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_statuses');
  
  // Try to revert back to ENUM
  const hasEmployees = await knex.schema.hasTable('employees');
  if (hasEmployees) {
    try {
      await knex.raw("ALTER TABLE employees MODIFY status ENUM('candidate', 'onboarding', 'probation', 'active', 'notice', 'exit', 'alumni') NULL DEFAULT 'candidate'");
    } catch (e) {
      console.warn("Could not revert employees.status back to ENUM. Data may contain values outside the allowed ENUM set.");
    }
  }
}
