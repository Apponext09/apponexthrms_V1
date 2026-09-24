import type { Knex } from 'knex';

/**
 * leave_types.UNIQUE(organization_id, leave_code) counts soft-deleted rows, so a deleted
 * leave type permanently burns its code (re-create → raw ER_DUP_ENTRY 500). Same fix as the
 * org-structure masters: a generated active_code that is NULL once deleted_at is set.
 */
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('leave_types'))) return;

  if (!(await knex.schema.hasColumn('leave_types', 'active_code'))) {
    await knex.raw(
      "ALTER TABLE `leave_types` ADD COLUMN `active_code` VARCHAR(100) " +
        "GENERATED ALWAYS AS (IF(`deleted_at` IS NULL, `leave_code`, NULL)) STORED"
    );
  }

  const [oldRows]: any = await knex.raw(
    "SELECT COUNT(1) AS c FROM information_schema.statistics " +
      "WHERE table_schema = DATABASE() AND table_name = 'leave_types' AND index_name = 'leave_types_organization_id_leave_code_unique'"
  );
  if (Number((Array.isArray(oldRows) ? oldRows[0] : oldRows)?.c || 0) > 0) {
    await knex.raw("ALTER TABLE `leave_types` DROP INDEX `leave_types_organization_id_leave_code_unique`");
  }

  const [newRows]: any = await knex.raw(
    "SELECT COUNT(1) AS c FROM information_schema.statistics " +
      "WHERE table_schema = DATABASE() AND table_name = 'leave_types' AND index_name = 'leave_types_org_active_code_uq'"
  );
  if (Number((Array.isArray(newRows) ? newRows[0] : newRows)?.c || 0) === 0) {
    await knex.raw(
      "ALTER TABLE `leave_types` ADD UNIQUE INDEX `leave_types_org_active_code_uq` (`organization_id`, `active_code`)"
    );
  }
}

export async function down(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('leave_types'))) return;
  try {
    await knex.raw("ALTER TABLE `leave_types` DROP INDEX `leave_types_org_active_code_uq`");
  } catch { /* ignore */ }
  try {
    await knex.raw(
      "ALTER TABLE `leave_types` ADD UNIQUE INDEX `leave_types_organization_id_leave_code_unique` (`organization_id`, `leave_code`)"
    );
  } catch { /* ignore */ }
  if (await knex.schema.hasColumn('leave_types', 'active_code')) {
    await knex.raw("ALTER TABLE `leave_types` DROP COLUMN `active_code`");
  }
}
