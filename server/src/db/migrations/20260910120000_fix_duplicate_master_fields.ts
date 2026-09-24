import type { Knex } from 'knex';

/**
 * Migration: Fix Duplicate Master Fields
 *
 * Problem: custom_master_fields table had only an INDEX (not UNIQUE) on
 * (master_id, field_key), allowing concurrent requests to insert duplicate
 * field rows for the same master. This caused absurd field counts
 * (e.g. 1427 fields for Company which should only have 24).
 *
 * Fix:
 *  1. Delete all duplicate rows, keeping the lowest `id` per (master_id, field_key).
 *  2. Add a UNIQUE constraint on (master_id, field_key) to prevent future duplicates.
 */
export async function up(knex: Knex): Promise<void> {
  // ── Step 1: Remove duplicate custom_master_fields rows ──────────────────
  // Keep only the row with the smallest id for each (master_id, field_key) pair.
  await knex.raw(`
    DELETE cmf
    FROM custom_master_fields cmf
    INNER JOIN (
      SELECT MIN(id) AS keep_id, master_id, field_key
      FROM custom_master_fields
      GROUP BY master_id, field_key
    ) AS keep_rows
      ON cmf.master_id = keep_rows.master_id
     AND cmf.field_key = keep_rows.field_key
     AND cmf.id > keep_rows.keep_id
  `);

  // ── Step 2: Drop the old non-unique index ────────────────────────────────
  // (MySQL errors if you try to add a UNIQUE key when the old index exists.)
  const hasOldIdx = await knex.raw(`
    SELECT COUNT(*) AS cnt
    FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE()
      AND table_name = 'custom_master_fields'
      AND index_name = 'cmf_master_key_idx'
  `);
  if (Number(hasOldIdx[0]?.[0]?.cnt) > 0) {
    await knex.schema.alterTable('custom_master_fields', (table) => {
      table.dropIndex(['master_id', 'field_key'], 'cmf_master_key_idx');
    });
  }

  // ── Step 3: Add UNIQUE constraint ────────────────────────────────────────
  const hasUniqueIdx = await knex.raw(`
    SELECT COUNT(*) AS cnt
    FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE()
      AND table_name = 'custom_master_fields'
      AND index_name = 'cmf_master_field_key_unique'
      AND non_unique = 0
  `);
  if (Number(hasUniqueIdx[0]?.[0]?.cnt) === 0) {
    await knex.schema.alterTable('custom_master_fields', (table) => {
      table.unique(['master_id', 'field_key'], {
        indexName: 'cmf_master_field_key_unique',
      });
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Remove the UNIQUE constraint and restore the plain index
  const hasUniqueIdx = await knex.raw(`
    SELECT COUNT(*) AS cnt
    FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE()
      AND table_name = 'custom_master_fields'
      AND index_name = 'cmf_master_field_key_unique'
      AND non_unique = 0
  `);
  if (Number(hasUniqueIdx[0]?.[0]?.cnt) > 0) {
    await knex.schema.alterTable('custom_master_fields', (table) => {
      table.dropUnique(['master_id', 'field_key'], 'cmf_master_field_key_unique');
    });
  }

  await knex.schema.alterTable('custom_master_fields', (table) => {
    table.index(['master_id', 'field_key'], 'cmf_master_key_idx');
  });
}
