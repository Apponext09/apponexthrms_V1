import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('employees', 'current_grade_id');
  
  if (!hasColumn) {
    await knex.schema.alterTable('employees', (table) => {
      table.bigInteger('current_grade_id').unsigned().nullable().after('current_department_id');
      table.foreign('current_grade_id').references('grades.id').onDelete('SET NULL');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('employees', 'current_grade_id');
  
  if (hasColumn) {
    await knex.schema.alterTable('employees', (table) => {
      table.dropForeign(['current_grade_id']);
      table.dropColumn('current_grade_id');
    });
  }
}
