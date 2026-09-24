import type { Knex } from 'knex';

/**
 * Additive-only migration — adds source tracking columns to lms_courses
 * and lms_certificates. All existing rows receive source = 'manual' as
 * a backfill default, so zero data is lost.
 */
export async function up(knex: Knex): Promise<void> {
  // ── lms_courses ─────────────────────────────────────────────────────────
  const hasSourceOnCourses = await knex.schema.hasColumn('lms_courses', 'source');
  if (!hasSourceOnCourses) {
    await knex.schema.alterTable('lms_courses', (table) => {
      // 'manual' | 'udemy' | 'coursera' | 'linkedin'
      table.string('source', 50).defaultTo('manual').after('status');
      // Platform-specific course ID used for upsert deduplication
      table.string('external_id', 255).nullable().after('source');
      // Deep-link to the course on the originating platform (for reference only)
      table.text('external_url').nullable().after('external_id');
    });

    // Backfill existing rows
    await knex('lms_courses').whereNull('source').update({ source: 'manual' });
    await knex.schema.alterTable('lms_courses', (table) => {
      table.index(['source']);
    });
  }

  // ── lms_certificates ─────────────────────────────────────────────────────
  const hasSourceOnCerts = await knex.schema.hasColumn('lms_certificates', 'source');
  if (!hasSourceOnCerts) {
    await knex.schema.alterTable('lms_certificates', (table) => {
      table.string('source', 50).defaultTo('manual').after('score');
    });

    await knex('lms_certificates').whereNull('source').update({ source: 'manual' });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Remove columns added in up()
  const hasSourceOnCourses = await knex.schema.hasColumn('lms_courses', 'source');
  if (hasSourceOnCourses) {
    await knex.schema.alterTable('lms_courses', (table) => {
      table.dropIndex(['source']);
      table.dropColumn('external_url');
      table.dropColumn('external_id');
      table.dropColumn('source');
    });
  }

  const hasSourceOnCerts = await knex.schema.hasColumn('lms_certificates', 'source');
  if (hasSourceOnCerts) {
    await knex.schema.alterTable('lms_certificates', (table) => {
      table.dropColumn('source');
    });
  }
}
