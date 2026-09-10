import type { Knex } from 'knex';

/**
 * resource_plans had NO organization_id column — GET /settings/resource-plans returned every
 * tenant's rows, and PUT/DELETE were addressable by id across tenants. Add the column so the
 * handlers can be scoped. Existing rows (none in dev) get NULL and are treated as legacy.
 */
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('resource_plans'))) return;
  if (!(await knex.schema.hasColumn('resource_plans', 'organization_id'))) {
    await knex.raw('ALTER TABLE `resource_plans` ADD COLUMN `organization_id` BIGINT UNSIGNED NULL AFTER `id`');
    await knex.raw('CREATE INDEX `resource_plans_org_idx` ON `resource_plans` (`organization_id`)');
  }
  if (!(await knex.schema.hasColumn('resource_plans', 'deleted_at'))) {
    await knex.raw('ALTER TABLE `resource_plans` ADD COLUMN `deleted_at` TIMESTAMP NULL');
  }
}

export async function down(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('resource_plans'))) return;
  if (await knex.schema.hasColumn('resource_plans', 'deleted_at')) {
    await knex.raw('ALTER TABLE `resource_plans` DROP COLUMN `deleted_at`');
  }
  if (await knex.schema.hasColumn('resource_plans', 'organization_id')) {
    try { await knex.raw('DROP INDEX `resource_plans_org_idx` ON `resource_plans`'); } catch { /* */ }
    await knex.raw('ALTER TABLE `resource_plans` DROP COLUMN `organization_id`');
  }
}
