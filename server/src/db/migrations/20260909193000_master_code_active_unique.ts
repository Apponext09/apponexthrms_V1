import type { Knex } from 'knex';

/**
 * departments / designations / grades / locations / branches each carry a
 * UNIQUE(organization_id, code) that also counts soft-deleted rows — so once a master is
 * deleted its code is permanently burned and re-creating anything with that code fails with
 * a raw ER_DUP_ENTRY (HTTP 500). Replace it with UNIQUE(organization_id, active_code) where
 * active_code is NULL for soft-deleted rows, freeing the code for reuse.
 */
const TABLES = ['departments', 'designations', 'grades', 'locations', 'branches'] as const;

export async function up(knex: Knex): Promise<void> {
  for (const table of TABLES) {
    if (!(await knex.schema.hasTable(table))) continue;

    if (!(await knex.schema.hasColumn(table, 'active_code'))) {
      await knex.raw(
        `ALTER TABLE \`${table}\` ADD COLUMN \`active_code\` VARCHAR(100) ` +
          `GENERATED ALWAYS AS (IF(\`deleted_at\` IS NULL, \`code\`, NULL)) STORED`
      );
    }

    // Drop the old all-rows unique index if present.
    const oldName = `${table}_organization_id_code_unique`;
    const [oldRows]: any = await knex.raw(
      `SELECT COUNT(1) AS c FROM information_schema.statistics ` +
        `WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
      [table, oldName]
    );
    const hasOld = Number((Array.isArray(oldRows) ? oldRows[0] : oldRows)?.c || 0) > 0;
    if (hasOld) {
      await knex.raw(`ALTER TABLE \`${table}\` DROP INDEX \`${oldName}\``);
    }

    const newName = `${table}_org_active_code_uq`;
    const [newRows]: any = await knex.raw(
      `SELECT COUNT(1) AS c FROM information_schema.statistics ` +
        `WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
      [table, newName]
    );
    const hasNew = Number((Array.isArray(newRows) ? newRows[0] : newRows)?.c || 0) > 0;
    if (!hasNew) {
      await knex.raw(
        `ALTER TABLE \`${table}\` ADD UNIQUE INDEX \`${newName}\` (\`organization_id\`, \`active_code\`)`
      );
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const table of TABLES) {
    if (!(await knex.schema.hasTable(table))) continue;
    try {
      await knex.raw(`ALTER TABLE \`${table}\` DROP INDEX \`${table}_org_active_code_uq\``);
    } catch { /* ignore */ }
    try {
      await knex.raw(
        `ALTER TABLE \`${table}\` ADD UNIQUE INDEX \`${table}_organization_id_code_unique\` (\`organization_id\`, \`code\`)`
      );
    } catch { /* ignore */ }
    if (await knex.schema.hasColumn(table, 'active_code')) {
      await knex.raw(`ALTER TABLE \`${table}\` DROP COLUMN \`active_code\``);
    }
  }
}
