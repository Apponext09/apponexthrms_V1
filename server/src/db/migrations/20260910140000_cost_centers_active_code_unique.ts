import type { Knex } from 'knex';

/**
 * cost_centers.UNIQUE(organization_id, code) counts soft-deleted rows — same code-reuse-after-delete
 * 500 as the other masters. Swap for an active-only unique index. (Cost Center got its first API
 * in Slice 6, so this is applied alongside it.)
 */
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('cost_centers'))) return;
  if (!(await knex.schema.hasColumn('cost_centers', 'active_code'))) {
    await knex.raw(
      "ALTER TABLE `cost_centers` ADD COLUMN `active_code` VARCHAR(50) " +
        "GENERATED ALWAYS AS (IF(`deleted_at` IS NULL, `code`, NULL)) STORED"
    );
  }
  const [oldRows]: any = await knex.raw(
    "SELECT COUNT(1) AS c FROM information_schema.statistics WHERE table_schema = DATABASE() " +
      "AND table_name = 'cost_centers' AND index_name = 'cost_centers_organization_id_code_unique'"
  );
  if (Number((Array.isArray(oldRows) ? oldRows[0] : oldRows)?.c || 0) > 0) {
    await knex.raw("ALTER TABLE `cost_centers` DROP INDEX `cost_centers_organization_id_code_unique`");
  }
  const [newRows]: any = await knex.raw(
    "SELECT COUNT(1) AS c FROM information_schema.statistics WHERE table_schema = DATABASE() " +
      "AND table_name = 'cost_centers' AND index_name = 'cost_centers_org_active_code_uq'"
  );
  if (Number((Array.isArray(newRows) ? newRows[0] : newRows)?.c || 0) === 0) {
    await knex.raw(
      "ALTER TABLE `cost_centers` ADD UNIQUE INDEX `cost_centers_org_active_code_uq` (`organization_id`, `active_code`)"
    );
  }
}

export async function down(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('cost_centers'))) return;
  try { await knex.raw("ALTER TABLE `cost_centers` DROP INDEX `cost_centers_org_active_code_uq`"); } catch { /* */ }
  try {
    await knex.raw(
      "ALTER TABLE `cost_centers` ADD UNIQUE INDEX `cost_centers_organization_id_code_unique` (`organization_id`, `code`)"
    );
  } catch { /* */ }
  if (await knex.schema.hasColumn('cost_centers', 'active_code')) {
    await knex.raw("ALTER TABLE `cost_centers` DROP COLUMN `active_code`");
  }
}
