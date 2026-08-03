import { getKnex } from '../../../db/knex';
import { v4 as uuidv4 } from 'uuid';

export interface OrgLeaveSettings {
  id?: string;
  organizationId: number;
  locationId: string | null;
  normalWorkingHoursDaily: number;
  fullTimeHours: number;
  weeklyWorkPattern: any;
  holidayYearStartMonth: number;
  maxConsecutiveAnnualLeaveDays: number | null;
  leaveClubbingRules: any[] | null;
  leaveRestrictionRules: any[] | null;
  defaultWeekDay: string | null;
  disableLeaveApplicationReminder: boolean;
  showPopupOnWeekOffOrHoliday: boolean;
  leaveApplicationDateRestriction: boolean;
}

/**
 * Returns default weekly work pattern
 */
export function getDefaultWeeklyWorkPattern(): Record<string, any> {
  const pattern: Record<string, any> = {};
  const workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  for (const day of ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']) {
    const isWorking = workingDays.includes(day);
    pattern[day] = isWorking
      ? { is_working: true, start: '09:00', end: '18:00' }
      : { is_working: false };
  }
  return pattern;
}

/**
 * Resolves leave settings for a specific location or organization fallback
 */
export async function getOrgLeaveSettings(
  organizationId: number,
  locationId: number | string | null
): Promise<OrgLeaveSettings> {
  const db = getKnex();

  // Fallback defaults used when the table doesn't exist yet or no rows match
  const fallback: OrgLeaveSettings = {
    organizationId,
    locationId: null,
    normalWorkingHoursDaily: 9,
    fullTimeHours: 8,
    weeklyWorkPattern: getDefaultWeeklyWorkPattern(),
    holidayYearStartMonth: 4,
    maxConsecutiveAnnualLeaveDays: null,
    leaveClubbingRules: [],
    leaveRestrictionRules: [],
    defaultWeekDay: null,
    disableLeaveApplicationReminder: false,
    showPopupOnWeekOffOrHoliday: false,
    leaveApplicationDateRestriction: false,
  };

  try {
    let locationUuid: string | null = null;

    if (locationId) {
      if (typeof locationId === 'number' || !isNaN(Number(locationId))) {
        // It's an integer location ID (current_location_id on employees)
        const loc = await db('locations').where('id', Number(locationId)).first();
        if (loc) {
          locationUuid = loc.uuid;
        }
      } else {
        locationUuid = String(locationId);
      }
    }

    let settingsRow = null;
    if (locationUuid) {
      settingsRow = await db('org_leave_settings')
        .where({ organization_id: organizationId, location_id: locationUuid })
        .first();
    }

    if (!settingsRow) {
      // Fallback to org-wide default
      settingsRow = await db('org_leave_settings')
        .where({ organization_id: organizationId })
        .whereNull('location_id')
        .first();
    }

    if (settingsRow) {
      let pattern = settingsRow.weekly_work_pattern || settingsRow.weeklyWorkPattern;
      if (typeof pattern === 'string') {
        try { pattern = JSON.parse(pattern); } catch (e) { pattern = null; }
      }

      let clubbingRules = settingsRow.leave_clubbing_rules || settingsRow.leaveClubbingRules || [];
      if (typeof clubbingRules === 'string') {
        try { clubbingRules = JSON.parse(clubbingRules); } catch (e) { clubbingRules = []; }
      }

      let restrictionRules = settingsRow.leave_restriction_rules || settingsRow.leaveRestrictionRules || [];
      if (typeof restrictionRules === 'string') {
        try { restrictionRules = JSON.parse(restrictionRules); } catch (e) { restrictionRules = []; }
      }

      const normalWorkingHoursDaily = parseFloat(settingsRow.normal_working_hours_daily || settingsRow.normalWorkingHoursDaily) || 9;
      const fullTimeHours = parseFloat(settingsRow.full_time_hours || settingsRow.fullTimeHours) || 8;
      const holidayYearStartMonth = parseInt(settingsRow.holiday_year_start_month || settingsRow.holidayYearStartMonth, 10) || 4;
      const maxConsecutiveAnnualLeaveDays = settingsRow.max_consecutive_annual_leave_days || settingsRow.maxConsecutiveAnnualLeaveDays
        ? parseFloat(settingsRow.max_consecutive_annual_leave_days || settingsRow.maxConsecutiveAnnualLeaveDays)
        : null;
      const defaultWeekDay = settingsRow.default_week_day || settingsRow.defaultWeekDay || null;
      const disableLeaveApplicationReminder = !!(settingsRow.disable_leave_application_reminder || settingsRow.disableLeaveApplicationReminder);
      const showPopupOnWeekOffOrHoliday = !!(settingsRow.show_popup_on_week_off_or_holiday || settingsRow.showPopupOnWeekOffOrHoliday);
      const leaveApplicationDateRestriction = !!(settingsRow.leave_application_date_restriction || settingsRow.leaveApplicationDateRestriction);

      return {
        id: settingsRow.id || settingsRow.uuid,
        organizationId: parseInt(settingsRow.organization_id || settingsRow.organizationId, 10),
        locationId: settingsRow.location_id || settingsRow.locationId || null,
        
        normalWorkingHoursDaily,
        fullTimeHours,
        weeklyWorkPattern: pattern || getDefaultWeeklyWorkPattern(),
        holidayYearStartMonth,
        maxConsecutiveAnnualLeaveDays,
        leaveClubbingRules: clubbingRules,
        leaveRestrictionRules: restrictionRules,
        defaultWeekDay,
        disableLeaveApplicationReminder,
        showPopupOnWeekOffOrHoliday,
        leaveApplicationDateRestriction,

        normal_working_hours_daily: normalWorkingHoursDaily,
        full_time_hours: fullTimeHours,
        weekly_work_pattern: pattern || getDefaultWeeklyWorkPattern(),
        holiday_year_start_month: holidayYearStartMonth,
        max_consecutive_annual_leave_days: maxConsecutiveAnnualLeaveDays,
        leave_clubbing_rules: clubbingRules,
        leave_restriction_rules: restrictionRules,
        default_week_day: defaultWeekDay,
        disable_leave_application_reminder: disableLeaveApplicationReminder,
        show_popup_on_week_off_or_holiday: showPopupOnWeekOffOrHoliday,
        leave_application_date_restriction: leaveApplicationDateRestriction,
      };
    }
  } catch (err: any) {
    // Table doesn't exist yet — return fallback defaults silently
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.message?.includes('no such table') || err?.message?.includes("doesn't exist")) {
      return fallback;
    }
    throw err;
  }

  return fallback;
}

/**
 * Determines working date for a timestamp when shifts cross midnight
 */
export function resolveWorkingDate(timestamp: Date | string | number, workPattern: any): string {
  const date = new Date(timestamp);
  
  // Format current time as HH:MM
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDayIndex = date.getDay();
  const currentDayName = dayNames[currentDayIndex];

  // Check previous day shift Timings (in case it crossed midnight to cover current timestamp)
  const prevDayIndex = (currentDayIndex - 1 + 7) % 7;
  const prevDayName = dayNames[prevDayIndex];

  const prevDayPattern = workPattern?.[prevDayName];
  if (prevDayPattern && prevDayPattern.is_working && prevDayPattern.start && prevDayPattern.end) {
    const { start, end } = prevDayPattern;
    if (end < start) {
      // Overnight shift crosses midnight and ends on current day at 'end'
      if (timeStr <= end) {
        const prevDate = new Date(date);
        prevDate.setDate(prevDate.getDate() - 1);
        return prevDate.toISOString().split('T')[0];
      }
    }
  }

  return date.toISOString().split('T')[0];
}
