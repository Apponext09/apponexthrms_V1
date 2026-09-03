import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasCol1 = await knex.schema.hasColumn("employee_attendance_locations", "allow_holiday_punch");
  if (!hasCol1) {
    await knex.schema.alterTable("employee_attendance_locations", (table) => {
      table.boolean("allow_holiday_punch").notNullable().defaultTo(false).comment("Allow this employee to punch attendance on public holidays");
      table.boolean("allow_weekoff_punch").notNullable().defaultTo(false).comment("Allow this employee to punch attendance on weekly off days");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasCol1 = await knex.schema.hasColumn("employee_attendance_locations", "allow_holiday_punch");
  if (hasCol1) {
    await knex.schema.alterTable("employee_attendance_locations", (table) => {
      table.dropColumn("allow_holiday_punch");
      table.dropColumn("allow_weekoff_punch");
    });
  }
}
