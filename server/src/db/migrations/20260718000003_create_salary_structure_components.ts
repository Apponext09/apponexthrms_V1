import type { Knex } from 'knex';

/**
 * LEGACY TABLE — superseded by payroll_slabs.selected_component_ids (Gen3).
 * salary_structure_components was the Gen1 junction between salary_structures and salary_components.
 * Migration updated to drop this table.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('salary_structure_components');
}

export async function down(knex: Knex): Promise<void> {
  // No rollback — table is deprecated
}




