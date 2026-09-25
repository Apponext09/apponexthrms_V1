import { v4 as uuidv4 } from "uuid";
import { closeKnex, getKnex } from "../db/knex";
import {
  evaluateShiftCheckout,
  evaluateShiftEntry,
  getShiftRules,
  isShiftWorkingDay,
  resolveShiftWindow,
} from "../modules/attendance/services/ShiftRuleEngine";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const at = (hour: number, minute = 0) =>
  new Date(2026, 8, 24, hour, minute, 0, 0);

async function main() {
  const db = getKnex();
  const organization = await db("organizations").select("id").first();
  const user = await db("users").select("id").first();
  const employee = await db("employees")
    .where("organization_id", organization?.id)
    .select("id")
    .first();

  assert(
    organization && user && employee,
    "Database needs an organization, user, and employee to run the disposable integration test.",
  );

  const shiftCode = `TEST-RULE-${Date.now()}`.slice(0, 50);
  const rules = {
    minHoursFullDayIncluded: "08:00",
    minHoursFullDayExcluded: "06:00",
    minHoursHalfDay: "04:00",
    halfDayStartTime: "11:00",
    shiftCutOffTime: "04:00",
    behaviorToggles: {
      excludeBreakTime: true,
      disableCheckInAfterBuffer: true,
      disableCheckOutBeforeTotalHours: true,
      noLateDeduction: false,
    },
  };
  const roster = {
    daysIncluded: ["mon", "tue", "wed", "thu", "fri"],
    excludedWorkingPattern: { sat: { second: true, fourth: true } },
    globalAttendanceRules: rules,
    behaviorToggles: rules.behaviorToggles,
  };

  const result = await db.transaction(async (trx) => {
    const [shiftId] = await trx("shift_templates").insert({
      uuid: uuidv4(),
      organization_id: organization!.id,
      shift_name: "Disposable shift-rule verification",
      shift_code: shiftCode,
      shift_type: "fixed",
      start_time: "09:00:00",
      end_time: "18:00:00",
      duration_hours: 8,
      grace_period_minutes: 15,
      break_duration_minutes: 60,
      is_night_shift: false,
      is_flexible: false,
      roster_pattern: JSON.stringify(roster),
      attendance_rules: JSON.stringify(rules),
      attendance_rules_version: 1,
      status: "active",
      created_by: user!.id,
      updated_by: user!.id,
    });

    const [assignmentId] = await trx("employee_shift_assignments").insert({
      uuid: uuidv4(),
      organization_id: organization!.id,
      employee_id: employee!.id,
      shift_id: shiftId,
      assignment_start_date: "2026-09-01",
      assignment_end_date: "2026-09-30",
      is_current: false,
      created_by: user!.id,
      updated_by: user!.id,
    });

    try {
      const shift = await trx("shift_templates").where("id", shiftId).first();
      assert(shift, "Temporary shift was not persisted.");
      const normalized = getShiftRules(shift);
      assert(
        normalized.minHoursFullDayIncluded === 8,
        "HH:MM full-day threshold was not persisted/read.",
      );
      assert(
        normalized.minHoursHalfDay === 4,
        "HH:MM half-day threshold was not persisted/read.",
      );

      assert(
        evaluateShiftEntry(shift, "2026-09-24", at(9, 15)).entryStatus ===
          "on_time",
        "Grace-period evaluation failed.",
      );
      assert(
        evaluateShiftEntry(shift, "2026-09-24", at(9, 16)).entryStatus ===
          "late",
        "Late-entry evaluation failed.",
      );
      let cutoffBlocked = false;
      try {
        evaluateShiftEntry(shift, "2026-09-24", at(11, 1));
      } catch {
        cutoffBlocked = true;
      }
      assert(cutoffBlocked, "Check-in cutoff blocking failed.");
      assert(
        evaluateShiftEntry(shift, "2026-09-24", at(11, 1), false)
          .entryStatus === "half_day",
        "Half-day cutoff classification failed.",
      );
      assert(
        evaluateShiftCheckout(shift, "2026-09-24", 540, 60, false).status ===
          "present",
        "Full-day finalization failed.",
      );
      let earlyCheckoutBlocked = false;
      try {
        evaluateShiftCheckout(shift, "2026-09-24", 300, 30, false);
      } catch {
        earlyCheckoutBlocked = true;
      }
      assert(earlyCheckoutBlocked, "Early-checkout blocking failed.");
      assert(
        evaluateShiftCheckout(shift, "2026-09-24", 300, 30, false, false)
          .status === "half_day",
        "Half-day finalization failed.",
      );
      assert(
        evaluateShiftCheckout(shift, "2026-09-24", 230, 0, false, false)
          .status === "absent",
        "Absent finalization failed.",
      );
      assert(
        evaluateShiftCheckout(shift, "2026-09-27", 360, 0, true).status ===
          "present",
        "Excluded-day threshold failed.",
      );
      assert(
        isShiftWorkingDay(new Date(2026, 8, 12), shift),
        "Second-Saturday roster rule failed.",
      );
      assert(
        !isShiftWorkingDay(new Date(2026, 8, 19), shift),
        "Non-working Saturday roster rule failed.",
      );

      const night = resolveShiftWindow(
        { start_time: "22:00", end_time: "06:00", duration_hours: 8 },
        "2026-09-24",
      );
      assert(
        night.end?.getDate() === 25 && night.end?.getHours() === 6,
        "Overnight shift window failed.",
      );
      return { shiftId, assignmentId };
    } finally {
      await trx("employee_shift_assignments")
        .where("id", assignmentId)
        .delete();
      await trx("shift_templates").where("id", shiftId).delete();
    }
  });

  const [remainingShift, remainingAssignment] = await Promise.all([
    db("shift_templates")
      .where("id", result.shiftId)
      .count<{ count: number }[]>({ count: "*" })
      .first(),
    db("employee_shift_assignments")
      .where("id", result.assignmentId)
      .count<{ count: number }[]>({ count: "*" })
      .first(),
  ]);
  assert(
    Number(remainingShift?.count || 0) === 0,
    "Temporary shift cleanup failed.",
  );
  assert(
    Number(remainingAssignment?.count || 0) === 0,
    "Temporary assignment cleanup failed.",
  );

  console.log(
    `PASS: database-backed temporary shift ${result.shiftId} and assignment ${result.assignmentId} were created, verified, and deleted.`,
  );
}

main()
  .catch((error) => {
    console.error(
      `FAIL: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  })
  .finally(async () => closeKnex());
