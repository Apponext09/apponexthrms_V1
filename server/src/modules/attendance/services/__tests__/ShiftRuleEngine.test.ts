import { describe, expect, it } from "vitest";
import { ValidationError } from "../../../../common/errors/index";
import {
  evaluateShiftCheckout,
  evaluateShiftEntry,
  getShiftRules,
  isShiftWorkingDay,
  resolveShiftWindow,
} from "../ShiftRuleEngine";

const localDate = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
) => new Date(year, month - 1, day, hour, minute, 0, 0);

describe("ShiftRuleEngine", () => {
  describe("getShiftRules", () => {
    it("normalizes legacy roster rules and preserves explicit false toggles", () => {
      const rules = getShiftRules({
        roster_pattern: JSON.stringify({
          daysIncluded: ["MON", "Tue"],
          globalAttendanceRules: {
            minHoursFullDayIncluded: "8.5",
            minHoursFullDayExcluded: 6,
            minHoursHalfDay: "4",
            shiftCutOffTime: "03:00",
            considerHalfDayAfterCheckin: "11:30",
          },
          behaviorToggles: {
            excludeBreakTime: false,
            disableCheckInAfterBuffer: true,
            disableCheckOutBeforeTotalHours: true,
            doNotConsiderForLateDeduction: true,
          },
        }),
      });

      expect(rules).toMatchObject({
        daysIncluded: ["mon", "tue"],
        minHoursFullDayIncluded: 8.5,
        minHoursFullDayExcluded: 6,
        minHoursHalfDay: 4,
        shiftCutOffTime: "03:00",
        halfDayStartTime: "11:30",
        excludeBreakTime: false,
        disableCheckInAfterBuffer: true,
        disableCheckOutBeforeTotalHours: true,
        doNotConsiderForLateDeduction: true,
      });
    });

    it("ignores invalid or negative hour thresholds", () => {
      const rules = getShiftRules({
        roster_pattern: {
          globalAttendanceRules: {
            minHoursFullDayIncluded: -1,
            minHoursHalfDay: "not-a-number",
          },
        },
      });

      expect(rules.minHoursFullDayIncluded).toBeUndefined();
      expect(rules.minHoursHalfDay).toBeUndefined();
    });

    it("prefers the versioned attendance rule document over legacy roster values", () => {
      const rules = getShiftRules({
        roster_pattern: {
          globalAttendanceRules: { minHoursFullDayIncluded: 7 },
          behaviorToggles: { excludeBreakTime: false },
        },
        attendance_rules: JSON.stringify({
          minHoursFullDayIncluded: 8,
          behaviorToggles: { excludeBreakTime: true },
        }),
        attendance_rules_version: 1,
      });

      expect(rules.minHoursFullDayIncluded).toBe(8);
      expect(rules.excludeBreakTime).toBe(true);
    });
  });

  describe("isShiftWorkingDay", () => {
    it("supports occurrence rules for excluded weekdays, not only Saturdays", () => {
      const pattern = {
        daysIncluded: ["mon", "tue", "wed", "thu", "fri"],
        excludedWorkingPattern: { sun: { second: true, last: true } },
      };

      expect(isShiftWorkingDay(localDate(2026, 9, 13), pattern)).toBe(true); // second Sunday
      expect(isShiftWorkingDay(localDate(2026, 9, 27), pattern)).toBe(true); // last Sunday
      expect(isShiftWorkingDay(localDate(2026, 9, 6), pattern)).toBe(false);
    });

    it("treats configured included days as working days", () => {
      expect(
        isShiftWorkingDay(localDate(2026, 9, 26), { daysIncluded: ["sat"] }),
      ).toBe(true);
    });
  });

  describe("resolveShiftWindow", () => {
    it("moves an overnight shift end to the following day", () => {
      const result = resolveShiftWindow(
        { start_time: "22:00", end_time: "06:00", duration_hours: 8 },
        "2026-09-24",
      );

      expect(result.start).toEqual(localDate(2026, 9, 24, 22));
      expect(result.end).toEqual(localDate(2026, 9, 25, 6));
    });

    it("anchors flexible duration to the actual check-in", () => {
      const actual = localDate(2026, 9, 24, 9, 20);
      const result = resolveShiftWindow(
        {
          shift_type: "flexible",
          flexible_start_range_start: "08:00",
          flexible_start_range_end: "10:00",
          duration_hours: 8,
        },
        "2026-09-24",
        actual,
      );

      expect(result.start).toEqual(actual);
      expect(result.end).toEqual(localDate(2026, 9, 24, 17, 20));
    });
  });

  describe("evaluateShiftEntry", () => {
    const shift = {
      start_time: "09:00",
      grace_period_minutes: 15,
      roster_pattern: {
        globalAttendanceRules: { halfDayStartTime: "11:00" },
        behaviorToggles: {},
      },
    };

    it("distinguishes on-time, late, and half-day arrivals", () => {
      expect(
        evaluateShiftEntry(shift, "2026-09-24", localDate(2026, 9, 24, 9, 15))
          .entryStatus,
      ).toBe("on_time");
      expect(
        evaluateShiftEntry(shift, "2026-09-24", localDate(2026, 9, 24, 9, 16)),
      ).toMatchObject({
        entryStatus: "late",
        isLate: true,
        status: "present",
        lateMinutes: 16,
      });
      expect(
        evaluateShiftEntry(shift, "2026-09-24", localDate(2026, 9, 24, 11, 1)),
      ).toMatchObject({
        entryStatus: "half_day",
        isLate: true,
        status: "half_day",
      });
    });

    it("blocks check-in after the configured cutoff", () => {
      const blocked = {
        ...shift,
        roster_pattern: {
          ...shift.roster_pattern,
          behaviorToggles: { disableCheckInAfterBuffer: true },
        },
      };
      expect(() =>
        evaluateShiftEntry(
          blocked,
          "2026-09-24",
          localDate(2026, 9, 24, 11, 1),
        ),
      ).toThrow(ValidationError);
    });

    it("suppresses late deduction without misclassifying the entry window", () => {
      const exempt = {
        ...shift,
        roster_pattern: {
          ...shift.roster_pattern,
          behaviorToggles: { doNotConsiderForLateDeduction: true },
        },
      };
      expect(
        evaluateShiftEntry(exempt, "2026-09-24", localDate(2026, 9, 24, 9, 30)),
      ).toMatchObject({
        entryStatus: "late",
        isLate: false,
        lateMinutes: 30,
      });
    });

    it("enforces both ends of a flexible check-in range when blocking is enabled", () => {
      const flexible = {
        shift_type: "flexible",
        flexible_start_range_start: "08:00",
        flexible_start_range_end: "10:00",
        roster_pattern: {
          behaviorToggles: { disableCheckInAfterBuffer: true },
        },
      };
      expect(() =>
        evaluateShiftEntry(
          flexible,
          "2026-09-24",
          localDate(2026, 9, 24, 7, 59),
        ),
      ).toThrow(ValidationError);
      expect(() =>
        evaluateShiftEntry(
          flexible,
          "2026-09-24",
          localDate(2026, 9, 24, 10, 1),
        ),
      ).toThrow(ValidationError);
    });
  });

  describe("evaluateShiftCheckout", () => {
    const shift = {
      duration_hours: 8,
      roster_pattern: {
        globalAttendanceRules: {
          minHoursFullDayIncluded: 8,
          minHoursFullDayExcluded: 6,
          minHoursHalfDay: 4,
        },
        behaviorToggles: { excludeBreakTime: true },
      },
    };

    it("derives final status from net worked time", () => {
      expect(
        evaluateShiftCheckout(shift, "2026-09-24", 540, 60, false),
      ).toMatchObject({ status: "present", workMinutes: 480 });
      expect(
        evaluateShiftCheckout(shift, "2026-09-24", 300, 30, false),
      ).toMatchObject({ status: "half_day", workMinutes: 270 });
      expect(
        evaluateShiftCheckout(shift, "2026-09-24", 230, 0, false),
      ).toMatchObject({ status: "absent", workMinutes: 230 });
    });

    it("uses the excluded-day threshold", () => {
      expect(
        evaluateShiftCheckout(shift, "2026-09-27", 360, 0, true),
      ).toMatchObject({ status: "present", fullMinutes: 360 });
    });

    it("keeps break time when exclusion is disabled", () => {
      const paidBreakShift = {
        ...shift,
        roster_pattern: {
          ...shift.roster_pattern,
          behaviorToggles: { excludeBreakTime: false },
        },
      };
      expect(
        evaluateShiftCheckout(paidBreakShift, "2026-09-24", 480, 60, false),
      ).toMatchObject({ status: "present", workMinutes: 480 });
    });

    it("rejects early checkout when full hours are mandatory", () => {
      const restricted = {
        ...shift,
        roster_pattern: {
          ...shift.roster_pattern,
          behaviorToggles: {
            excludeBreakTime: true,
            disableCheckOutBeforeTotalHours: true,
          },
        },
      };
      expect(() =>
        evaluateShiftCheckout(restricted, "2026-09-24", 480, 30, false),
      ).toThrow(ValidationError);
    });
  });
});
