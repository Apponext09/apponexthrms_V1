import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasLatePolicies = await knex.schema.hasTable('late_deduction_policies');
  if (hasLatePolicies) {
    await knex.raw('ALTER TABLE late_deduction_policies MODIFY is_active VARCHAR(20) DEFAULT "active"');
    await knex.raw('UPDATE late_deduction_policies SET is_active = "active" WHERE is_active IS NULL OR is_active = "" OR is_active = "1" OR is_active = "true" OR is_active = "0" OR is_active = "false"');
  }

  const hasLateUpdations = await knex.schema.hasTable('late_updations');
  if (hasLateUpdations) {
    await knex.raw('ALTER TABLE late_updations MODIFY is_active VARCHAR(20) DEFAULT "active"');
    await knex.raw('UPDATE late_updations SET is_active = "active" WHERE is_active IS NULL OR is_active = "" OR is_active = "1" OR is_active = "true" OR is_active = "0" OR is_active = "false"');
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasLatePolicies = await knex.schema.hasTable('late_deduction_policies');
  if (hasLatePolicies) {
    await knex.raw('ALTER TABLE late_deduction_policies MODIFY is_active TINYINT(1) DEFAULT 1');
  }

  const hasLateUpdations = await knex.schema.hasTable('late_updations');
  if (hasLateUpdations) {
    await knex.raw('ALTER TABLE late_updations MODIFY is_active TINYINT(1) DEFAULT 1');
  }
}
