import type { Knex } from "knex";

/**
 * Keeps enforceable attendance rules separate from roster presentation data.
 *
 * `roster_pattern` remains supported for backwards compatibility. Existing
 * globalAttendanceRules are copied into `attendance_rules` so deployments do
 * not lose their configured behaviour when the runtime switches to the typed
 * rule document.
 */
export async function up(knex: Knex): Promise<void> {
  const tableExists = await knex.schema.hasTable("shift_templates");
  if (!tableExists) return;

  const hasAttendanceRules = await knex.schema.hasColumn(
    "shift_templates",
    "attendance_rules",
  );
  const hasRulesVersion = await knex.schema.hasColumn(
    "shift_templates",
    "attendance_rules_version",
  );
  const hasTimezone = await knex.schema.hasColumn(
    "shift_templates",
    "timezone",
  );

  await knex.schema.alterTable("shift_templates", (table) => {
    if (!hasAttendanceRules) {
      table.json("attendance_rules").nullable().after("roster_pattern");
    }
    if (!hasRulesVersion) {
      table
        .integer("attendance_rules_version")
        .unsigned()
        .notNullable()
        .defaultTo(1)
        .after("attendance_rules");
    }
    if (!hasTimezone) {
      table.string("timezone", 64).nullable().after("attendance_rules_version");
    }
  });

  // The source column is native JSON, so JSON_EXTRACT is safe and preserves
  // booleans/numbers rather than coercing the document to text.
  if (!hasAttendanceRules) {
    await knex.raw(`
      UPDATE shift_templates
      SET attendance_rules = JSON_EXTRACT(roster_pattern, '$.globalAttendanceRules')
      WHERE roster_pattern IS NOT NULL
        AND JSON_EXTRACT(roster_pattern, '$.globalAttendanceRules') IS NOT NULL
        AND attendance_rules IS NULL
    `);
  }
}

export async function down(knex: Knex): Promise<void> {
  const tableExists = await knex.schema.hasTable("shift_templates");
  if (!tableExists) return;

  const hasAttendanceRules = await knex.schema.hasColumn(
    "shift_templates",
    "attendance_rules",
  );
  const hasRulesVersion = await knex.schema.hasColumn(
    "shift_templates",
    "attendance_rules_version",
  );
  const hasTimezone = await knex.schema.hasColumn(
    "shift_templates",
    "timezone",
  );

  await knex.schema.alterTable("shift_templates", (table) => {
    if (hasTimezone) table.dropColumn("timezone");
    if (hasRulesVersion) table.dropColumn("attendance_rules_version");
    if (hasAttendanceRules) table.dropColumn("attendance_rules");
  });
}
