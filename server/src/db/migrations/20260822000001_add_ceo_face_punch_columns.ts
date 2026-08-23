import type { Knex } from "knex";

/**
 * CEO Face Punch — All DB column additions in one migration.
 *
 * Tables changed:
 *   1. employees                    ? is_ceo, is_ceo_profile_hidden
 *   2. employee_biometric_profiles  ? is_ceo_face
 *   3. attendance_records           ? is_ceo_punch
 */
export async function up(knex: Knex): Promise<void> {
  // 1. employees
  if (await knex.schema.hasTable("employees")) {
    const hasCeo = await knex.schema.hasColumn("employees", "is_ceo");
    if (!hasCeo) {
      await knex.schema.alterTable("employees", (table) => {
        table.boolean("is_ceo").notNullable().defaultTo(false)
          .comment("True for the Organization Admin / CEO employee row");
        table.boolean("is_ceo_profile_hidden").notNullable().defaultTo(true)
          .comment("Hides CEO from employee directory listings");
      });
    }
  }

  // 2. employee_biometric_profiles
  if (await knex.schema.hasTable("employee_biometric_profiles")) {
    const hasCeoFace = await knex.schema.hasColumn("employee_biometric_profiles", "is_ceo_face");
    if (!hasCeoFace) {
      await knex.schema.alterTable("employee_biometric_profiles", (table) => {
        table.boolean("is_ceo_face").notNullable().defaultTo(false)
          .comment("Marks this face vector as the CEO/Admin biometric enrollment");
      });
    }
  }

  // 3. attendance_records
  if (await knex.schema.hasTable("attendance_records")) {
    const hasCeoPunch = await knex.schema.hasColumn("attendance_records", "is_ceo_punch");
    if (!hasCeoPunch) {
      await knex.schema.alterTable("attendance_records", (table) => {
        table.boolean("is_ceo_punch").notNullable().defaultTo(false)
          .comment("True when this record was submitted via the CEO face punch terminal");
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // 3. attendance_records
  if (await knex.schema.hasTable("attendance_records")) {
    if (await knex.schema.hasColumn("attendance_records", "is_ceo_punch")) {
      await knex.schema.alterTable("attendance_records", (t) => t.dropColumn("is_ceo_punch"));
    }
  }

  // 2. employee_biometric_profiles
  if (await knex.schema.hasTable("employee_biometric_profiles")) {
    if (await knex.schema.hasColumn("employee_biometric_profiles", "is_ceo_face")) {
      await knex.schema.alterTable("employee_biometric_profiles", (t) => t.dropColumn("is_ceo_face"));
    }
  }

  // 1. employees
  if (await knex.schema.hasTable("employees")) {
    if (await knex.schema.hasColumn("employees", "is_ceo")) {
      await knex.schema.alterTable("employees", (t) => {
        t.dropColumn("is_ceo");
        t.dropColumn("is_ceo_profile_hidden");
      });
    }
  }
}
