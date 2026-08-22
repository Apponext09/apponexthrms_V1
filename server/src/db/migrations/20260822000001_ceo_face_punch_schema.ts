import type { Knex } from 'knex';

/**
 * Migration: CEO Face Punch Schema
 *
 * Changes:
 *   1. employees                   -> add is_ceo, is_ceo_profile_hidden
 *   2. employee_biometric_profiles -> add is_ceo_face
 *   3. attendance_records          -> add is_ceo_punch
 */
export async function up(knex: Knex): Promise<void> {
  // ── 1. employees ─────────────────────────────────────────────────────────────
  if (await knex.schema.hasTable('employees')) {
    const hasCeo = await knex.schema.hasColumn('employees', 'is_ceo');
    if (!hasCeo) {
      await knex.schema.alterTable('employees', (table) => {
        table.boolean('is_ceo').notNullable().defaultTo(false)
          .comment('True when this employee row represents the Organization Admin / CEO');
        table.boolean('is_ceo_profile_hidden').notNullable().defaultTo(true)
          .comment('When true, employee is excluded from the HR employee directory listing');
      });
    }
  }

  // ── 2. employee_biometric_profiles ───────────────────────────────────────────
  if (await knex.schema.hasTable('employee_biometric_profiles')) {
    const hasCeoFace = await knex.schema.hasColumn('employee_biometric_profiles', 'is_ceo_face');
    if (!hasCeoFace) {
      await knex.schema.alterTable('employee_biometric_profiles', (table) => {
        table.boolean('is_ceo_face').notNullable().defaultTo(false)
          .comment('True when this face profile belongs to the CEO / Organization Admin');
      });
    }
  }

  // ── 3. attendance_records ────────────────────────────────────────────────────
  if (await knex.schema.hasTable('attendance_records')) {
    const hasCeoPunch = await knex.schema.hasColumn('attendance_records', 'is_ceo_punch');
    if (!hasCeoPunch) {
      await knex.schema.alterTable('attendance_records', (table) => {
        table.boolean('is_ceo_punch').notNullable().defaultTo(false)
          .comment('True when this record was created via the CEO Face Punch terminal');
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('employees')) {
    const hasCeo = await knex.schema.hasColumn('employees', 'is_ceo');
    if (hasCeo) {
      await knex.schema.alterTable('employees', (t) => {
        t.dropColumn('is_ceo');
        t.dropColumn('is_ceo_profile_hidden');
      });
    }
  }

  if (await knex.schema.hasTable('employee_biometric_profiles')) {
    const hasCeoFace = await knex.schema.hasColumn('employee_biometric_profiles', 'is_ceo_face');
    if (hasCeoFace) {
      await knex.schema.alterTable('employee_biometric_profiles', (t) => {
        t.dropColumn('is_ceo_face');
      });
    }
  }

  if (await knex.schema.hasTable('attendance_records')) {
    const hasCeoPunch = await knex.schema.hasColumn('attendance_records', 'is_ceo_punch');
    if (hasCeoPunch) {
      await knex.schema.alterTable('attendance_records', (t) => {
        t.dropColumn('is_ceo_punch');
      });
    }
  }
}
