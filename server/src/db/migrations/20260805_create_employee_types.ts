import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('employee_types');
  if (!hasTable) {
    await knex.schema.createTable('employee_types', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.string('name', 150).notNullable();
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

  // Alter the employees table to support dynamic strings/IDs instead of ENUM
  const hasEmployees = await knex.schema.hasTable('employees');
  if (hasEmployees) {
    // In MySQL, to change an ENUM to VARCHAR without data loss:
    await knex.raw("ALTER TABLE employees MODIFY employment_type VARCHAR(100) NULL DEFAULT 'full_time'");
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_types');
  
  // Try to revert back to ENUM
  const hasEmployees = await knex.schema.hasTable('employees');
  if (hasEmployees) {
    try {
      await knex.raw("ALTER TABLE employees MODIFY employment_type ENUM('full_time', 'part_time', 'contract', 'internship') NULL DEFAULT 'full_time'");
    } catch (e) {
      console.warn("Could not revert employees.employment_type back to ENUM. Data may contain values outside the allowed ENUM set.");
    }
  }
}
