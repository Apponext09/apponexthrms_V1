import { ValidationError } from "../../../common/errors/index";

export type ShiftAttendanceStatus = "present" | "half_day" | "absent";

export interface NormalizedShiftRules {
  daysIncluded?: string[];
  excludedWorkingPattern?: Record<string, Record<string, boolean>>;
  minHoursFullDayIncluded?: number;
  minHoursFullDayExcluded?: number;
  minHoursHalfDay?: number;
  shiftCutOffTime?: string;
  halfDayStartTime?: string;
  excludeBreakTime?: boolean;
  disableCheckInAfterBuffer?: boolean;
  disableCheckOutBeforeTotalHours?: boolean;
  doNotConsiderForLateDeduction?: boolean;
}

const numberOrUndefined = (value: unknown): number | undefined => {
  if (value === "" || value == null) return undefined;
  if (typeof value === "string" && /^\d{1,3}:\d{2}$/.test(value.trim())) {
    const [hours, minutes] = value.trim().split(":").map(Number);
    if (minutes < 60) return hours + minutes / 60;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const boolOrUndefined = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

export const parseRosterPattern = (shift: any): any => {
  const raw = shift?.roster_pattern ?? shift?.rosterPattern;
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
};

export const getShiftRules = (shift: any): NormalizedShiftRules => {
  const pattern = parseRosterPattern(shift);
  let persisted: any = shift?.attendance_rules ?? shift?.attendanceRules ?? {};
  if (typeof persisted === "string") {
    try {
      persisted = JSON.parse(persisted);
    } catch {
      persisted = {};
    }
  }
  const global = {
    ...(pattern.globalAttendanceRules || {}),
    ...(persisted.globalAttendanceRules || persisted.rules || persisted),
  };
  const toggles = {
    ...(pattern.behaviorToggles || {}),
    ...(persisted.behaviorToggles || {}),
  };
  return {
    daysIncluded: Array.isArray(pattern.daysIncluded)
      ? pattern.daysIncluded.map((v: any) => String(v).toLowerCase())
      : undefined,
    excludedWorkingPattern: pattern.excludedWorkingPattern,
    minHoursFullDayIncluded: numberOrUndefined(global.minHoursFullDayIncluded),
    minHoursFullDayExcluded: numberOrUndefined(global.minHoursFullDayExcluded),
    minHoursHalfDay: numberOrUndefined(global.minHoursHalfDay),
    shiftCutOffTime: global.shiftCutOffTime || undefined,
    halfDayStartTime:
      global.halfDayStartTime ||
      global.considerHalfDayAfterCheckin ||
      pattern.considerHalfDayAfterCheckin ||
      undefined,
    excludeBreakTime: boolOrUndefined(toggles.excludeBreakTime),
    disableCheckInAfterBuffer: boolOrUndefined(
      toggles.disableCheckInAfterBuffer,
    ),
    disableCheckOutBeforeTotalHours: boolOrUndefined(
      toggles.disableCheckOutBeforeTotalHours,
    ),
    doNotConsiderForLateDeduction: boolOrUndefined(
      toggles.doNotConsiderForLateDeduction ?? toggles.noLateDeduction,
    ),
  };
};

export const dateAtTime = (
  date: string,
  time: string | null | undefined,
): Date | null => {
  if (!time) return null;
  const match = String(time)
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);
  if (minute > 59 || second > 59 || hour > (match[4] ? 12 : 23)) return null;
  if (match[4]) {
    if (hour === 12) hour = 0;
    if (match[4].toUpperCase() === "PM") hour += 12;
  }
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, hour, minute, second, 0);
};

export const isShiftWorkingDay = (date: Date, shiftOrPattern: any): boolean => {
  const pattern =
    shiftOrPattern?.roster_pattern !== undefined ||
    shiftOrPattern?.rosterPattern !== undefined
      ? parseRosterPattern(shiftOrPattern)
      : typeof shiftOrPattern === "string"
        ? (() => {
            try {
              return JSON.parse(shiftOrPattern);
            } catch {
              return {};
            }
          })()
        : shiftOrPattern || {};
  const included = Array.isArray(pattern.daysIncluded)
    ? pattern.daysIncluded.map((v: any) => String(v).toLowerCase())
    : ["mon", "tue", "wed", "thu", "fri"];
  const names = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const name = names[date.getDay()];
  if (included.includes(name)) return true;
  const rule = pattern.excludedWorkingPattern?.[name];
  if (!rule) return false;
  const occurrence = Math.floor((date.getDate() - 1) / 7) + 1;
  const lastOccurrence =
    date.getDate() + 7 >
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return Boolean(
    rule[["", "first", "second", "third", "fourth", "fifth"][occurrence]] ||
    (lastOccurrence && rule.last),
  );
};

export const resolveShiftWindow = (
  shift: any,
  parentDate: string,
  actualStart?: Date,
) => {
  const flexible =
    Boolean(shift?.is_flexible ?? shift?.isFlexible) ||
    (shift?.shift_type ?? shift?.shiftType) === "flexible";
  const rangeStart = dateAtTime(
    parentDate,
    shift?.flexible_start_range_start ?? shift?.flexibleStartRangeStart,
  );
  const rangeEnd = dateAtTime(
    parentDate,
    shift?.flexible_start_range_end ?? shift?.flexibleStartRangeEnd,
  );
  let start = dateAtTime(parentDate, shift?.start_time ?? shift?.startTime);
  if (flexible) start = actualStart || rangeStart || start;
  let end = dateAtTime(parentDate, shift?.end_time ?? shift?.endTime);
  const durationHours =
    numberOrUndefined(shift?.duration_hours ?? shift?.durationHours) ?? 8;
  if (!end && start) end = new Date(start.getTime() + durationHours * 3600000);
  if (start && end && end <= start) end.setDate(end.getDate() + 1);
  return { flexible, rangeStart, rangeEnd, start, end, durationHours };
};

export const evaluateShiftEntry = (
  shift: any,
  parentDate: string,
  now: Date,
  enforceRestrictions = true,
) => {
  const rules = getShiftRules(shift);
  const window = resolveShiftWindow(shift, parentDate, now);
  if (
    enforceRestrictions &&
    window.flexible &&
    window.rangeStart &&
    now < window.rangeStart
  ) {
    throw new ValidationError(
      `Check-in opens at ${String(shift.flexible_start_range_start ?? shift.flexibleStartRangeStart).slice(0, 5)}.`,
    );
  }
  if (
    enforceRestrictions &&
    window.flexible &&
    window.rangeEnd &&
    now > window.rangeEnd &&
    rules.disableCheckInAfterBuffer
  ) {
    throw new ValidationError(
      `Check-in is closed after ${String(shift.flexible_start_range_end ?? shift.flexibleStartRangeEnd).slice(0, 5)}.`,
    );
  }
  const scheduledStart = window.flexible
    ? window.rangeStart || window.start
    : window.start;
  if (!scheduledStart)
    return {
      status: "present" as const,
      isLate: false,
      entryStatus: "no_shift" as const,
      lateMinutes: 0,
      graceDeadlineLabel: "--",
      halfDayDeadlineLabel: "--",
    };
  const grace = Math.max(
    0,
    Number(shift.grace_period_minutes ?? shift.gracePeriodMinutes ?? 0),
  );
  const graceDeadline = new Date(scheduledStart.getTime() + grace * 60000);
  const explicitHalfDay = dateAtTime(parentDate, rules.halfDayStartTime);
  const halfDayDeadline =
    explicitHalfDay || new Date(scheduledStart.getTime() + 2 * 3600000);
  if (
    enforceRestrictions &&
    rules.disableCheckInAfterBuffer &&
    now > halfDayDeadline
  ) {
    throw new ValidationError(
      `Check-in is closed after ${halfDayDeadline.toTimeString().slice(0, 5)}.`,
    );
  }
  const rawLate = now > graceDeadline;
  const isLate = rules.doNotConsiderForLateDeduction ? false : rawLate;
  const status =
    now > halfDayDeadline ? ("half_day" as const) : ("present" as const);
  return {
    status,
    isLate,
    entryStatus:
      now > halfDayDeadline
        ? ("half_day" as const)
        : rawLate
          ? ("late" as const)
          : ("on_time" as const),
    lateMinutes: rawLate
      ? Math.max(
          0,
          Math.floor((now.getTime() - scheduledStart.getTime()) / 60000),
        )
      : 0,
    graceDeadlineLabel: graceDeadline.toTimeString().slice(0, 5),
    halfDayDeadlineLabel: halfDayDeadline.toTimeString().slice(0, 5),
  };
};

export const evaluateShiftCheckout = (
  shift: any,
  parentDate: string,
  grossMinutes: number,
  breakMinutes: number,
  isExcludedDay: boolean,
  enforceEarlyCheckout = true,
) => {
  const rules = getShiftRules(shift);
  const workMinutes = Math.max(
    0,
    grossMinutes - (rules.excludeBreakTime === false ? 0 : breakMinutes),
  );
  const configuredFullHours = isExcludedDay
    ? rules.minHoursFullDayExcluded
    : rules.minHoursFullDayIncluded;
  const fullMinutes = Math.round(
    (configuredFullHours ??
      numberOrUndefined(shift?.duration_hours ?? shift?.durationHours) ??
      0) * 60,
  );
  const halfMinutes = Math.round(
    (rules.minHoursHalfDay ?? (fullMinutes ? fullMinutes / 2 / 60 : 0)) * 60,
  );
  if (
    enforceEarlyCheckout &&
    rules.disableCheckOutBeforeTotalHours &&
    fullMinutes > 0 &&
    workMinutes < fullMinutes
  ) {
    throw new ValidationError(
      `Checkout is allowed after completing ${fullMinutes} working minutes; ${workMinutes} minutes are completed.`,
    );
  }
  const hasStatusThresholds =
    configuredFullHours !== undefined || rules.minHoursHalfDay !== undefined;
  const status: ShiftAttendanceStatus | undefined = hasStatusThresholds
    ? fullMinutes > 0 && workMinutes >= fullMinutes
      ? "present"
      : halfMinutes > 0 && workMinutes >= halfMinutes
        ? "half_day"
        : "absent"
    : undefined;
  return { workMinutes, status, fullMinutes, halfMinutes, rules };
};
