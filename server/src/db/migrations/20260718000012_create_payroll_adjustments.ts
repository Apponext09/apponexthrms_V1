import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // payroll_adjustments is deprecated and replaced by payroll_register_overrides
  await knex.schema.dropTableIfExists('payroll_adjustments');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payroll_adjustments');
}
