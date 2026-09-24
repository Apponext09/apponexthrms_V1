import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('payroll_runs');
  if (hasTable) {
    await knex.raw(`
      ALTER TABLE payroll_runs 
      MODIFY COLUMN status ENUM('draft', 'processing', 'calculated', 'locked', 'approved', 'published', 'completed') DEFAULT 'draft'
    `);
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('payroll_runs');
  if (hasTable) {
    await knex.raw(`
      ALTER TABLE payroll_runs 
      MODIFY COLUMN status ENUM('draft', 'processing', 'locked', 'approved', 'published', 'completed') DEFAULT 'draft'
    `);
  }
}
