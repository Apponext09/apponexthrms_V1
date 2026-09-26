import type { Knex } from 'knex';

/**
 * Enforce one master `code` per organization. The original master-builder migration
 * created only a non-unique lookup index (cm_org_code_idx), which allowed duplicate
 * codes — getMasterByCode() then returned an arbitrary row and the Masters Hub keyed
 * tabs ambiguously. Soft-deleted rows are excluded via a generated column so a code
 * can be reused after its master is deleted.
 */
export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('custom_masters');
  if (!hasTable) return;

  const hasCol = await knex.schema.hasColumn('custom_masters', 'active_code');
  if (!hasCol) {
    await knex.raw(
      "ALTER TABLE `custom_masters` ADD COLUMN `active_code` VARCHAR(100) " +
      "GENERATED ALWAYS AS (IF(`deleted_at` IS NULL, `code`, NULL)) STORED"
    );
  }

  // Drop any pre-existing duplicates-safe: only add the constraint if it does not exist.
  const [rows] = await knex.raw(
    "SELECT COUNT(1) AS c FROM information_schema.statistics " +
    "WHERE table_schema = DATABASE() AND table_name = 'custom_masters' " +
    "AND index_name = 'cm_org_active_code_uq'"
  );
  const exists = Array.isArray(rows) ? Number(rows[0]?.c || 0) : Number((rows as any)?.c || 0);
  if (!exists) {
    await knex.raw(
      "ALTER TABLE `custom_masters` ADD UNIQUE INDEX `cm_org_active_code_uq` " +
      "(`organization_id`, `active_code`)"
    );
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('custom_masters');
  if (!hasTable) return;
  try {
    await knex.raw("ALTER TABLE `custom_masters` DROP INDEX `cm_org_active_code_uq`");
  } catch (e) { /* ignore */ }
  const hasCol = await knex.schema.hasColumn('custom_masters', 'active_code');
  if (hasCol) {
    await knex.raw("ALTER TABLE `custom_masters` DROP COLUMN `active_code`");
  }
}
