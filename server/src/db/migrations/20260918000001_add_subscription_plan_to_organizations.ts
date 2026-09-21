import type { Knex } from 'knex';

/**
 * Migration: Add subscription plan linkage to organizations table
 *
 * Adds:
 *   - subscription_plan_id: FK to subscription_plans.id (nullable)
 *   - enabled_modules: JSON column (cached copy of the plan modules array)
 *
 * If an org has no plan assigned => enabled_modules = NULL => full access (backward compatible)
 */
export async function up(knex: Knex): Promise<void> {
  const hasSubscriptionPlanId = await knex.schema.hasColumn('organizations', 'subscription_plan_id');
  const hasEnabledModules = await knex.schema.hasColumn('organizations', 'enabled_modules');

  if (!hasSubscriptionPlanId || !hasEnabledModules) {
    await knex.schema.alterTable('organizations', (table) => {
      if (!hasSubscriptionPlanId) {
        table
          .bigInteger('subscription_plan_id')
          .unsigned()
          .nullable()
          .references('id')
          .inTable('subscription_plans')
          .onDelete('SET NULL');
        table.index(['subscription_plan_id']);
      }

      if (!hasEnabledModules) {
        table.json('enabled_modules').nullable();
      }
    });
    console.log('Added subscription_plan_id and enabled_modules to organizations');
  } else {
    console.log('organizations.subscription_plan_id and enabled_modules already exist');
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasSubscriptionPlanId = await knex.schema.hasColumn('organizations', 'subscription_plan_id');
  const hasEnabledModules = await knex.schema.hasColumn('organizations', 'enabled_modules');

  await knex.schema.alterTable('organizations', (table) => {
    if (hasEnabledModules) table.dropColumn('enabled_modules');
    if (hasSubscriptionPlanId) table.dropColumn('subscription_plan_id');
  });
}
