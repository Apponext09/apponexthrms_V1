import { Knex } from 'knex';
import { db } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';

export interface OffDayCheckResult {
  isOff: boolean;
  type?: 'Holiday' | 'WeekOff';
  name?: string;
  offType?: 'Full Day' | 'Half Day' | string;
  isOptional?: boolean;
  holidayType?: string;
  isAlternate?: boolean;
}

export interface WorkingDaysBreakdown {
  totalCalendarDays: number;
  offDaysCount: number;
  workingDaysCount: number;
  days: Array<{
    date: string;
    dayOfWeek: string;
    isOff: boolean;
    type?: 'Holiday' | 'WeekOff';
    name?: string;
    offType?: string;
  }>;
  workingDays: Array<{ date: string; dayOfWeek: string }>;
  offDays: Array<{ date: string; dayOfWeek: string; type: string; name?: string }>;
}

export class HolidayCalendarService {
  /**
   * Resolve which published holiday calendar applies to a given employee.
   * Priority:
   * 1. calendar_assignments matching exact (location_id, department_id)
   * 2. calendar_assignments matching location_id (department_id is null)
   * 3. calendar_assignments matching department_id (location_id is null)
   * 4. Direct holiday_calendars matching company_id and location_id
   * 5. Direct holiday_calendars matching company_id (location_id is null)
   * 6. Global org fallback
   */
  async getCalendarForEmployee(
    trxOrDb: Knex | Knex.Transaction | null,
    ctx: TenantContext,
    employeeId: number,
    targetYear?: number
  ): Promise<{ calendarId: number; calendar: any } | null> {
    const query = trxOrDb || db;
    const year = targetYear || new Date().getFullYear();

    // 1. Fetch employee details
    const employee = await query('employees')
      .where('organization_id', ctx.organizationId)
      .where('id', employeeId)
      .whereNull('deleted_at')
      .first();

    if (!employee) {
      return null;
    }

    const companyId = employee.company_id || employee.companyId || ctx.companyId || null;
    const locationId = employee.current_location_id || employee.currentLocationId || null;
    const departmentId = employee.current_department_id || employee.currentDepartmentId || null;

    // 2. Fetch calendars for this organization & year
    // Accept 'Published', 'Active', 'active', or any non-deleted calendar for the year
    let publishedCalendars = await query('holiday_calendars')
      .where('organization_id', ctx.organizationId)
      .whereIn('status', ['Published', 'Active', 'active', 'published', 'Draft', 'draft'])
      .where((builder) => {
        builder.where('calendar_year', year).orWhere('year', year);
      })
      .whereNull('deleted_at');

    if (!publishedCalendars || publishedCalendars.length === 0) {
      // Final fallback: any non-deleted calendar for this year
      publishedCalendars = await query('holiday_calendars')
        .where('organization_id', ctx.organizationId)
        .where((builder) => {
          builder.where('calendar_year', year).orWhere('year', year);
        })
        .whereNull('deleted_at')
        .orderByRaw("CASE WHEN status IN ('Published', 'Active', 'active') THEN 1 WHEN status IN ('Draft', 'draft') THEN 2 ELSE 3 END");
    }

    if (!publishedCalendars || publishedCalendars.length === 0) {
      return null;
    }

    const calendarIds = publishedCalendars.map((c: any) => c.id);

    // 3. Check calendar_assignments for these calendars
    const assignments = await query('calendar_assignments')
      .where('organization_id', ctx.organizationId)
      .whereIn('calendar_id', calendarIds)
      .whereNull('deleted_at');

    // Priority 1: Exact Location + Department match in assignments
    if (locationId && departmentId) {
      const match = assignments.find((a: any) => {
        const aLoc = a.location_id || a.locationId;
        const aDept = a.department_id || a.departmentId;
        return Number(aLoc) === Number(locationId) && Number(aDept) === Number(departmentId);
      });
      if (match) {
        const matchCalId = match.calendar_id || match.calendarId;
        const cal = publishedCalendars.find((c: any) => c.id === matchCalId);
        if (cal) return { calendarId: cal.id, calendar: cal };
      }
    }

    // Priority 2: Location match in assignments (department is null/all)
    if (locationId) {
      const match = assignments.find((a: any) => {
        const aLoc = a.location_id || a.locationId;
        const aDept = a.department_id || a.departmentId;
        return Number(aLoc) === Number(locationId) && (!aDept || aDept === null);
      });
      if (match) {
        const matchCalId = match.calendar_id || match.calendarId;
        const cal = publishedCalendars.find((c: any) => c.id === matchCalId);
        if (cal) return { calendarId: cal.id, calendar: cal };
      }
    }

    // Priority 3: Department match in assignments (location is null/all)
    if (departmentId) {
      const match = assignments.find((a: any) => {
        const aLoc = a.location_id || a.locationId;
        const aDept = a.department_id || a.departmentId;
        return Number(aDept) === Number(departmentId) && (!aLoc || aLoc === null);
      });
      if (match) {
        const matchCalId = match.calendar_id || match.calendarId;
        const cal = publishedCalendars.find((c: any) => c.id === matchCalId);
        if (cal) return { calendarId: cal.id, calendar: cal };
      }
    }

    // Priority 4: Direct holiday_calendars match on location_id
    if (locationId) {
      const cal = publishedCalendars.find((c: any) => {
        const cLoc = c.location_id || c.locationId || c.applicable_location_id || c.applicableLocationId;
        const cComp = c.company_id || c.companyId;
        return Number(cLoc) === Number(locationId) && (!companyId || Number(cComp) === Number(companyId));
      });
      if (cal) return { calendarId: cal.id, calendar: cal };
    }

    // Priority 5: Direct holiday_calendars match on company_id (company-wide)
    if (companyId) {
      const cal = publishedCalendars.find((c: any) => {
        const cLoc = c.location_id || c.locationId || c.applicable_location_id || c.applicableLocationId;
        const cComp = c.company_id || c.companyId;
        return Number(cComp) === Number(companyId) && (!cLoc || cLoc === null);
      });
      if (cal) return { calendarId: cal.id, calendar: cal };
    }

    // Priority 6: Any published calendar for the organization (fallback)
    const fallback = publishedCalendars[0];
    return fallback ? { calendarId: fallback.id, calendar: fallback } : null;
  }

  /**
   * Check if a given date is a Holiday or Week-Off under a calendar.
   */
  async isHolidayOrWeekOff(
    trxOrDb: Knex | Knex.Transaction | null,
    ctx: TenantContext,
    calendarId: number,
    dateInput: string | Date
  ): Promise<OffDayCheckResult> {
    const query = trxOrDb || db;
    const dateObj = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

    // Build a local YYYY-MM-DD string that accounts for IST (+5:30).
    // Holidays are commonly stored in DB as UTC timestamps that represent midnight IST
    // (i.e. holiday_date '2026-01-01 IST' = '2025-12-31T18:30:00Z').
    // We compare using both the UTC date and the IST date so we catch both storage conventions.
    const utcDateStr = dateObj.toISOString().split('T')[0];
    // IST = UTC + 5:30 = UTC + 330 minutes
    const istOffset = 5 * 60 + 30;
    const istMs = dateObj.getTime() + istOffset * 60 * 1000;
    const istDateStr = new Date(istMs).toISOString().split('T')[0];
    // Use the IST date for comparison (it matches what users see on screen)
    const dateStr = istDateStr;

    // 1. Check if date exists in holidays table
    // Use DATE(CONVERT_TZ(holiday_date, '+00:00', '+05:30')) to handle IST-stored UTC dates
    const holiday = await query('holidays')
      .where('organization_id', ctx.organizationId)
      .where((builder) => {
        builder.where('calendar_id', calendarId).orWhere('holiday_calendar_id', calendarId);
      })
      .where((builder) => {
        // Match either the UTC date or IST-adjusted date to handle both storage conventions
        builder
          .whereRaw("DATE(CONVERT_TZ(holiday_date, '+00:00', '+05:30')) = ?", [dateStr])
          .orWhereRaw('DATE(holiday_date) = ?', [dateStr])
          .orWhereRaw('DATE(holiday_date) = ?', [utcDateStr]);
      })
      .whereNull('deleted_at')
      .first();

    if (holiday) {
      const isOpt = holiday.isOptional !== undefined ? Boolean(holiday.isOptional) : Boolean(holiday.is_optional);
      const hType = holiday.holidayType || holiday.holiday_type || (isOpt ? 'Optional' : 'National');
      const hName = holiday.holidayName || holiday.holiday_name || holiday.name || 'Public Holiday';

      return {
        isOff: true,
        type: 'Holiday',
        name: hName,
        offType: 'Full Day',
        isOptional: isOpt,
        holidayType: hType,
      };
    }

    // 2. Check weekly_off_rules table
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekDay = dayNames[dateObj.getDay()]; // e.g. 'Sat', 'Sun'

    const weekOffRule = await query('weekly_off_rules')
      .where('calendar_id', calendarId)
      .where('week_day', weekDay)
      .where((builder) => {
        builder.where('organization_id', ctx.organizationId).orWhereNull('organization_id');
      })
      .whereNull('deleted_at')
      .first();

    if (weekOffRule) {
      const isAlt = Boolean(weekOffRule.isAlternate || weekOffRule.is_alternate);
      const altWeeks = weekOffRule.alternateWeeks || weekOffRule.alternate_weeks;
      const offTypeVal = weekOffRule.offType || weekOffRule.off_type || 'Full Day';

      // If alternate Saturday/rule
      if (isAlt) {
        const dayOfMonth = dateObj.getDate();
        const nthWeekday = Math.floor((dayOfMonth - 1) / 7) + 1; // 1..5

        const allowedWeeks = altWeeks
          ? String(altWeeks)
              .split(',')
              .map((s) => s.trim())
          : [];

        if (allowedWeeks.includes(String(nthWeekday))) {
          return {
            isOff: true,
            type: 'WeekOff',
            name: `${nthWeekday}${getOrdinalSuffix(nthWeekday)} ${weekDay} Off`,
            offType: offTypeVal,
            isAlternate: true,
          };
        } else {
          // Working Saturday/weekday
          return { isOff: false };
        }
      }

      return {
        isOff: true,
        type: 'WeekOff',
        name: `${weekDay} Weekly Off`,
        offType: offTypeVal,
        isAlternate: false,
      };
    }

    // Default: Regular working day
    return { isOff: false };
  }

  /**
   * Loop through each date from fromDate to toDate inclusive and calculate working days vs holidays/week-offs.
   */
  async getWorkingDaysBetween(
    trxOrDb: Knex | Knex.Transaction | null,
    ctx: TenantContext,
    calendarId: number,
    fromDate: string,
    toDate: string
  ): Promise<WorkingDaysBreakdown> {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days: WorkingDaysBreakdown['days'] = [];
    const workingDays: WorkingDaysBreakdown['workingDays'] = [];
    const offDays: WorkingDaysBreakdown['offDays'] = [];

    const cur = new Date(start);
    while (cur <= end) {
      const curStr = cur.toISOString().split('T')[0];
      const dayOfWeek = dayNames[cur.getDay()];

      const check = await this.isHolidayOrWeekOff(trxOrDb, ctx, calendarId, cur);

      if (check.isOff) {
        days.push({
          date: curStr,
          dayOfWeek,
          isOff: true,
          type: check.type,
          name: check.name,
          offType: check.offType,
        });
        offDays.push({
          date: curStr,
          dayOfWeek,
          type: check.type || 'Off',
          name: check.name,
        });
      } else {
        days.push({
          date: curStr,
          dayOfWeek,
          isOff: false,
        });
        workingDays.push({
          date: curStr,
          dayOfWeek,
        });
      }

      cur.setDate(cur.getDate() + 1);
    }

    return {
      totalCalendarDays: days.length,
      offDaysCount: offDays.length,
      workingDaysCount: workingDays.length,
      days,
      workingDays,
      offDays,
    };
  }

  /**
   * Fetch holidays and weekly off rules for a given employee (or active calendar)
   */
  async getEmployeeHolidaysAndRules(
    trxOrDb: Knex | Knex.Transaction | null,
    ctx: TenantContext,
    employeeId: number,
    targetYear?: number
  ): Promise<{
    calendar: any;
    holidays: any[];
    weeklyOffRules: any[];
  } | null> {
    const query = trxOrDb || db;
    const year = targetYear || new Date().getFullYear();
    const resolved = await this.getCalendarForEmployee(trxOrDb, ctx, employeeId, year);

    let targetCalendar = resolved?.calendar || null;
    let targetCalendarId = resolved?.calendarId || null;

    if (!targetCalendarId) {
      // Fallback: look for any published or active calendar for the current year
      const fallbackCal = await query('holiday_calendars')
        .where('organization_id', ctx.organizationId)
        .where((builder) => {
          builder.where('calendar_year', year).orWhere('year', year);
        })
        .whereNull('deleted_at')
        .orderByRaw("CASE WHEN status IN ('Published', 'Active', 'active') THEN 1 WHEN status IN ('Draft', 'draft') THEN 2 ELSE 3 END")
        .first();

      if (fallbackCal) {
        targetCalendar = fallbackCal;
        targetCalendarId = fallbackCal.id;
      }
    }

    if (targetCalendarId) {
      const holidays = await query('holidays')
        .where('organization_id', ctx.organizationId)
        .where((builder) => {
          builder.where('calendar_id', targetCalendarId).orWhere('holiday_calendar_id', targetCalendarId);
        })
        .whereNull('deleted_at')
        .orderBy('holiday_date', 'asc');

      const weeklyOffRules = await query('weekly_off_rules')
        .where('calendar_id', targetCalendarId)
        .where((builder) => {
          builder.where('organization_id', ctx.organizationId).orWhereNull('organization_id');
        })
        .whereNull('deleted_at');

      return {
        calendar: targetCalendar,
        holidays: holidays || [],
        weeklyOffRules: weeklyOffRules || [],
      };
    }

    return null;
  }
}

function getOrdinalSuffix(n: number): string {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}

export const holidayCalendarService = new HolidayCalendarService();
