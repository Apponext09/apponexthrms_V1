import type { Knex } from 'knex';

/**
 * Migration: System Master Support
 *
 * This migration extends the Master Builder to support "System Masters" —
 * masters whose data lives in real, relational DB tables (departments, companies,
 * locations, designations, grades, employee_statuses, etc.) but whose *field
 * definitions* are managed dynamically from the Master Builder UI.
 *
 * This makes every hardcoded master fully customizable (add/remove fields, reorder,
 * add choice lists, validations, etc.) while preserving all existing FK relationships.
 *
 * New additions:
 *   custom_masters:
 *     - system_table        VARCHAR(100)  — the real DB table that backs this master
 *     - system_id_column    VARCHAR(100)  — PK column name in that table (default: 'id')
 *     - system_name_column  VARCHAR(100)  — column used as the display name (default: 'name')
 *
 *   custom_master_fields:
 *     - column_map  VARCHAR(100)  — actual DB column this field maps to (NULL = extra field)
 *     - is_core     BOOLEAN       — core fields cannot be deleted from Master Builder UI
 *
 *   custom_master_extended_data (NEW TABLE):
 *     - Stores extra dynamic field values for system master records that have no
 *       matching real column. Keyed by (master_id, record_ref_id).
 */
export async function up(knex: Knex): Promise<void> {
  // ── 1. Alter custom_masters ──────────────────────────────────────────────
  const hasSystemTable = await knex.schema.hasColumn('custom_masters', 'system_table');
  if (!hasSystemTable) {
    await knex.schema.alterTable('custom_masters', (table) => {
      table.string('system_table', 100).nullable().after('is_system');
      table.string('system_id_column', 100).defaultTo('id').after('system_table');
      table.string('system_name_column', 100).defaultTo('name').after('system_id_column');
    });
  }

  // ── 2. Alter custom_master_fields ─────────────────────────────────────────
  const hasColumnMap = await knex.schema.hasColumn('custom_master_fields', 'column_map');
  if (!hasColumnMap) {
    await knex.schema.alterTable('custom_master_fields', (table) => {
      table.string('column_map', 100).nullable().after('display_order')
        .comment('Real DB column this field maps to — NULL means extra field stored in extended_data');
      table.boolean('is_core').defaultTo(false).after('column_map')
        .comment('Core fields cannot be deleted from Master Builder UI');
    });
  }

  // ── 3. Create custom_master_extended_data ─────────────────────────────────
  const hasExtended = await knex.schema.hasTable('custom_master_extended_data');
  if (!hasExtended) {
    await knex.schema.createTable('custom_master_extended_data', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.string('uuid', 36).nullable();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('master_id').unsigned().notNullable();

      // The PK value in the real backing table (e.g., departments.id)
      table.bigInteger('record_ref_id').unsigned().notNullable();

      // Extra field values as JSON — only fields with column_map IS NULL
      table.json('data').notNullable();

      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('master_id').references('custom_masters.id').onDelete('CASCADE');
      table.unique(['master_id', 'record_ref_id'], 'cmed_master_record_unique');
      table.index(['organization_id', 'master_id'], 'cmed_org_master_idx');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('custom_master_extended_data');

  const hasColumnMap = await knex.schema.hasColumn('custom_master_fields', 'column_map');
  if (hasColumnMap) {
    await knex.schema.alterTable('custom_master_fields', (table) => {
      table.dropColumn('column_map');
      table.dropColumn('is_core');
    });
  }

  const hasSystemTable = await knex.schema.hasColumn('custom_masters', 'system_table');
  if (hasSystemTable) {
    await knex.schema.alterTable('custom_masters', (table) => {
      table.dropColumn('system_table');
      table.dropColumn('system_id_column');
      table.dropColumn('system_name_column');
    });
  }
}
