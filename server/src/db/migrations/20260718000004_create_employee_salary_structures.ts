import type { Knex } from 'knex';

/**
 * LEGACY TABLE — Gen1 assignment junction superseded by salary_structures.employee_id (Gen2/3).
 * PayrollService fallback references removed. Migration updated to drop this table.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_salary_structures');
}

export async function down(knex: Knex): Promise<void> {
  // No rollback — table is deprecated
}





