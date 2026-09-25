export interface ShiftRuleValidationInput {
  isFlexible: boolean;
  startTime: string;
  endTime: string;
  flexibleStartRangeStart?: string;
  flexibleStartRangeEnd?: string;
  totalTime: string;
  logBreakTime: string;
  bufferTime: string;
  halfDayStartTime: string;
  minHoursFullDayIncluded: string;
  minHoursFullDayExcluded: string;
  minHoursHalfDay: string;
  shiftCutOffTime: string;
  minExcludedDaysWorked: number;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const minutesFromHHMM = (value: string): number => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

export function validateShiftRules(
  input: ShiftRuleValidationInput,
): string | null {
  const durations: Array<[string, string, boolean]> = [
    ["Total time", input.totalTime, false],
    ["Break time", input.logBreakTime, true],
    ["Check-in buffer", input.bufferTime, true],
    ["Included-day full-day minimum", input.minHoursFullDayIncluded, false],
    ["Excluded-day full-day minimum", input.minHoursFullDayExcluded, false],
    ["Half-day minimum", input.minHoursHalfDay, false],
  ];
  for (const [label, value, allowZero] of durations) {
    if (!TIME.test(value || ""))
      return `${label} must use HH:MM (00:00 to 23:59).`;
    if (!allowZero && minutesFromHHMM(value) === 0)
      return `${label} must be greater than 00:00.`;
  }
  if (!TIME.test(input.shiftCutOffTime || ""))
    return "Shift cut-off time must be a valid time.";
  if (
    !Number.isInteger(input.minExcludedDaysWorked) ||
    input.minExcludedDaysWorked < 0 ||
    input.minExcludedDaysWorked > 7
  ) {
    return "Minimum excluded days worked must be a whole number from 0 to 7.";
  }
  const total = minutesFromHHMM(input.totalTime);
  const breaks = minutesFromHHMM(input.logBreakTime);
  const actual = total - breaks;
  if (breaks >= total)
    return "Break time must be shorter than the total shift time.";
  if (minutesFromHHMM(input.minHoursHalfDay) > actual)
    return "Half-day minimum cannot exceed actual working hours.";
  if (minutesFromHHMM(input.minHoursFullDayIncluded) > actual)
    return "Included-day full-day minimum cannot exceed actual working hours.";
  if (minutesFromHHMM(input.minHoursFullDayExcluded) > actual)
    return "Excluded-day full-day minimum cannot exceed actual working hours.";
  if (
    minutesFromHHMM(input.minHoursHalfDay) >
    minutesFromHHMM(input.minHoursFullDayIncluded)
  ) {
    return "Half-day minimum cannot exceed the included-day full-day minimum.";
  }
  if (input.isFlexible) {
    if (
      !TIME.test(input.flexibleStartRangeStart || "") ||
      !TIME.test(input.flexibleStartRangeEnd || "")
    ) {
      return "Flexible shifts require valid start-range times.";
    }
    if (
      minutesFromHHMM(input.flexibleStartRangeStart!) >=
      minutesFromHHMM(input.flexibleStartRangeEnd!)
    ) {
      return "Flexible start-range end must be later than its start.";
    }
  } else {
    if (!TIME.test(input.startTime) || !TIME.test(input.endTime))
      return "Shift start and end times are required.";
    if (input.startTime === input.endTime)
      return "Shift end time must be different from the start time.";
    if (!TIME.test(input.halfDayStartTime))
      return "Half-day check-in cutoff must be a valid time.";
    const start = minutesFromHHMM(input.startTime);
    let end = minutesFromHHMM(input.endTime);
    let halfDay = minutesFromHHMM(input.halfDayStartTime);
    if (end <= start) end += 1440;
    if (halfDay < start) halfDay += 1440;
    if (halfDay <= start || halfDay >= end)
      return "Half-day check-in cutoff must fall inside the shift window.";
  }
  return null;
}

export function attendanceRules(input: ShiftRuleValidationInput) {
  return {
    minHoursFullDayExcluded: input.minHoursFullDayExcluded,
    minHoursFullDayIncluded: input.minHoursFullDayIncluded,
    minHoursHalfDay: input.minHoursHalfDay,
    minExcludedDaysWorked: input.minExcludedDaysWorked,
    shiftCutOffTime: input.shiftCutOffTime,
    halfDayStartTime: input.isFlexible ? null : input.halfDayStartTime,
  };
}
