import type { Knex } from 'knex';

/**
 * LEGACY TABLE — superseded by payroll_components (Gen3 payroll engine).
 * salary_components was the Gen1 component master. All active code now uses payroll_components.
 * Migration updated to drop this table.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('salary_components');
}

export async function down(knex: Knex): Promise<void> {
  // No rollback — table is deprecated
}





