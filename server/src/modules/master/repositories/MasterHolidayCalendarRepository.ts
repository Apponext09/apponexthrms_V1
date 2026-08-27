import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';
import { v4 as uuidv4 } from 'uuid';

export interface MasterHolidayCalendar {
  id: number;
  uuid: string;
  organization_id: number;
  name?: string;
  calendar_name: string;
  year?: number;
  calendar_year: number;
  company_id: number | null;
  region_id: number | null;
  location_id: number | null;
  description: string | null;
  is_default: boolean;
  status: 'Draft' | 'Published' | 'Archived' | string;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class MasterHolidayCalendarRepository extends BaseRepository<MasterHolidayCalendar> {
  constructor() {
    super('holiday_calendars');
  }

  /**
   * Check for duplicate calendar with same scope (company_id, region_id, location_id, calendar_year)
   */
  async findDuplicate(
    ctx: TenantContext,
    params: {
      companyId?: number | null;
      regionId?: number | null;
      locationId?: number | null;
      year: number;
      excludeId?: number | string;
    }
  ): Promise<MasterHolidayCalendar | null> {
    let q = this.query(ctx).where((builder) => {
      builder.where('calendar_year', params.year).orWhere('year', params.year);
    });

    if (params.companyId !== undefined && params.companyId !== null) {
      q = q.where('company_id', params.companyId);
    } else {
      q = q.whereNull('company_id');
    }

    if (params.regionId !== undefined && params.regionId !== null) {
      q = q.where('region_id', params.regionId);
    } else {
      q = q.whereNull('region_id');
    }

    if (params.locationId !== undefined && params.locationId !== null) {
      q = q.where((builder) => {
        builder.where('location_id', params.locationId).orWhere('applicable_location_id', params.locationId);
      });
    } else {
      q = q.where((builder) => {
        builder.whereNull('location_id').whereNull('applicable_location_id');
      });
    }

    if (params.excludeId) {
      q = q.whereNot('id', params.excludeId);
    }

    const row = await q.whereNull('deleted_at').first();
    return row || null;
  }

  /**
   * Create new calendar
   */
  async createCalendar(
    ctx: TenantContext,
    data: {
      calendar_name: string;
      calendar_year: number;
      company_id?: number | null;
      region_id?: number | null;
      location_id?: number | null;
      description?: string | null;
      status?: string;
    }
  ): Promise<MasterHolidayCalendar> {
    const calUuid = uuidv4();
    const name = data.calendar_name;
    const year = data.calendar_year;
    const status = data.status || 'Draft';
    const userId = ctx.userId ? Number(ctx.userId) : 1;

    const [id] = await this.db('holiday_calendars').insert({
      uuid: calUuid,
      organization_id: ctx.organizationId,
      name: name,
      calendar_name: name,
      year: year,
      calendar_year: year,
      company_id: data.company_id ?? null,
      region_id: data.region_id ?? null,
      location_id: data.location_id ?? null,
      applicable_location_id: data.location_id ?? null,
      description: data.description ?? null,
      status: status,
      is_default: false,
      created_by: userId,
      updated_by: userId,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });

    const created = await this.query(ctx).where('id', id).first();
    return created!;
  }

  /**
   * List calendars with flexible filters
   */
  async listCalendars(
    ctx: TenantContext,
    filters: {
      company_id?: number | string;
      region_id?: number | string;
      location_id?: number | string;
      year?: number | string;
      calendar_year?: number | string;
      status?: string;
      search?: string;
    }
  ): Promise<any[]> {
    let q = this.query(ctx).whereNull('deleted_at');

    if (filters.company_id) {
      q = q.where('company_id', Number(filters.company_id));
    }
    if (filters.region_id) {
      q = q.where('region_id', Number(filters.region_id));
    }
    if (filters.location_id) {
      const locId = Number(filters.location_id);
      q = q.where((b) => b.where('location_id', locId).orWhere('applicable_location_id', locId));
    }
    const targetYear = filters.calendar_year || filters.year;
    if (targetYear) {
      const yr = Number(targetYear);
      q = q.where((b) => b.where('calendar_year', yr).orWhere('year', yr));
    }
    if (filters.status) {
      q = q.where('status', filters.status);
    }
    if (filters.search) {
      q = q.where((b) => {
        b.where('name', 'like', `%${filters.search}%`)
          .orWhere('calendar_name', 'like', `%${filters.search}%`)
          .orWhere('description', 'like', `%${filters.search}%`);
      });
    }

    const calendars = await q.orderBy('calendar_year', 'desc').orderBy('name', 'asc');

    // Attach holiday count to each calendar
    const calendarIds = calendars.map((c: any) => c.id);
    let holidayCounts: Record<number, number> = {};
    if (calendarIds.length > 0) {
      const counts = await this.db('holidays')
        .whereIn('holiday_calendar_id', calendarIds)
        .orWhereIn('calendar_id', calendarIds)
        .whereNull('deleted_at')
        .groupBy('holiday_calendar_id')
        .select('holiday_calendar_id', this.db.raw('COUNT(*) as total'));
      
      counts.forEach((row: any) => {
        const id = row.holidayCalendarId || row.holiday_calendar_id;
        holidayCounts[id] = Number(row.total || 0);
      });
    }

    return calendars.map((cal: any) => ({
      ...cal,
      calendar_name: cal.calendarName || cal.calendar_name || cal.name,
      calendar_year: cal.calendarYear || cal.calendar_year || cal.year,
      total_holidays: holidayCounts[cal.id] || 0,
    }));
  }

  /**
   * Get single calendar with its nested holidays and weekly-off rules
   */
  async getCalendarWithDetails(ctx: TenantContext, id: number | string): Promise<any | null> {
    const calendar = await this.query(ctx)
      .where('id', id)
      .whereNull('deleted_at')
      .first();

    if (!calendar) return null;

    // Fetch holidays
    const holidays = await this.db('holidays')
      .where((b) => b.where('calendar_id', id).orWhere('holiday_calendar_id', id))
      .whereNull('deleted_at')
      .orderBy('holiday_date', 'asc');

    // Fetch weekly off rules
    const weeklyOffRules = await this.db('weekly_off_rules')
      .where('calendar_id', id)
      .whereNull('deleted_at')
      .orderBy('id', 'asc');

    // Fetch assignments
    const assignments = await this.db('calendar_assignments')
      .where('calendar_id', id)
      .whereNull('deleted_at')
    const MONTH_NAMES = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const formattedHolidays = holidays.map((h: any) => {
      const dateStr = typeof h.holidayDate === 'string' ? h.holidayDate.split('T')[0] : (h.holiday_date ? new Date(h.holiday_date).toISOString().split('T')[0] : h.holidayDate);
      const d = new Date(dateStr);
      const monthIndex = !isNaN(d.getTime()) ? d.getMonth() : 0;
      return {
        id: h.id,
        uuid: h.uuid,
        calendar_id: h.calendarId || h.calendar_id || h.holidayCalendarId || h.holiday_calendar_id,
        holiday_name: h.holidayName || h.holiday_name,
        holiday_date: dateStr,
        month: MONTH_NAMES[monthIndex],
        month_number: monthIndex + 1,
        holiday_type: h.holidayType || h.holiday_type || 'National',
        is_optional: !!(h.isOptional ?? h.is_optional),
        description: h.description,
        created_at: h.createdAt || h.created_at,
      };
    });

    // Group by month
    const monthWiseHolidays: Record<string, any[]> = {};
    MONTH_NAMES.forEach((m) => { monthWiseHolidays[m] = []; });
    formattedHolidays.forEach((h: any) => {
      if (monthWiseHolidays[h.month]) {
        monthWiseHolidays[h.month].push(h);
      }
    });

    const monthBreakdown = MONTH_NAMES.map((m, idx) => ({
      month: m,
      month_number: idx + 1,
      total_holidays: monthWiseHolidays[m].length,
      holidays: monthWiseHolidays[m],
    }));

    return {
      ...calendar,
      calendar_name: calendar.calendarName || calendar.calendar_name || calendar.name,
      calendar_year: calendar.calendarYear || calendar.calendar_year || calendar.year,
      total_holidays: formattedHolidays.length,
      holidays: formattedHolidays,
      month_wise_holidays: monthWiseHolidays,
      month_breakdown: monthBreakdown,
      weekly_off_rules: weeklyOffRules.map((w: any) => ({
        id: w.id,
        uuid: w.uuid,
        calendar_id: w.calendarId || w.calendar_id,
        week_day: w.weekDay || w.week_day,
        off_type: w.offType || w.off_type,
        is_alternate: !!(w.isAlternate ?? w.is_alternate),
        alternate_weeks: w.alternateWeeks || w.alternate_weeks,
        created_at: w.createdAt || w.created_at,
      })),
      assignments: assignments.map((a: any) => ({
        id: a.id,
        uuid: a.uuid,
        calendar_id: a.calendarId || a.calendar_id,
        company_id: a.companyId || a.company_id,
        location_id: a.locationId || a.location_id,
        department_id: a.departmentId || a.department_id,
        employee_group_id: a.employeeGroupId || a.employee_group_id,
        assigned_at: a.assignedAt || a.assigned_at,
      })),
    };
  }

  /**
   * Update calendar
   */
  async updateCalendar(
    ctx: TenantContext,
    id: number | string,
    data: {
      calendar_name?: string;
      calendar_year?: number;
      company_id?: number | null;
      region_id?: number | null;
      location_id?: number | null;
      description?: string | null;
      status?: string;
    }
  ): Promise<any | null> {
    const existing = await this.query(ctx).where('id', id).whereNull('deleted_at').first();
    if (!existing) return null;

    const updatePayload: any = {
      updated_by: ctx.userId ? Number(ctx.userId) : 1,
      updated_at: this.db.fn.now(),
    };

    if (data.calendar_name !== undefined) {
      updatePayload.calendar_name = data.calendar_name;
      updatePayload.name = data.calendar_name;
    }
    if (data.calendar_year !== undefined) {
      updatePayload.calendar_year = data.calendar_year;
      updatePayload.year = data.calendar_year;
    }
    if (data.company_id !== undefined) {
      updatePayload.company_id = data.company_id;
    }
    if (data.region_id !== undefined) {
      updatePayload.region_id = data.region_id;
    }
    if (data.location_id !== undefined) {
      updatePayload.location_id = data.location_id;
      updatePayload.applicable_location_id = data.location_id;
    }
    if (data.description !== undefined) {
      updatePayload.description = data.description;
    }
    if (data.status !== undefined) {
      updatePayload.status = data.status;
    }

    await this.db('holiday_calendars').where('id', id).update(updatePayload);

    return this.getCalendarWithDetails(ctx, id);
  }

  /**
   * Delete calendar and cascade delete its holidays and weekly-off rules
   */
  async deleteCalendarCascade(ctx: TenantContext, id: number | string): Promise<boolean> {
    const existing = await this.query(ctx).where('id', id).whereNull('deleted_at').first();
    if (!existing) return false;

    // Soft delete or hard delete child records
    await this.db('holidays')
      .where((b) => b.where('calendar_id', id).orWhere('holiday_calendar_id', id))
      .delete();

    await this.db('weekly_off_rules').where('calendar_id', id).delete();
    await this.db('calendar_assignments').where('calendar_id', id).delete();

    // Delete calendar
    await this.db('holiday_calendars').where('id', id).delete();
    return true;
  }

  /**
   * Publish calendar
   */
  async publishCalendar(ctx: TenantContext, id: number | string): Promise<any | null> {
    const existing = await this.query(ctx).where('id', id).whereNull('deleted_at').first();
    if (!existing) return null;

    await this.db('holiday_calendars')
      .where('id', id)
      .update({
        status: 'Published',
        updated_by: ctx.userId ? Number(ctx.userId) : 1,
        updated_at: this.db.fn.now(),
      });

    return this.getCalendarWithDetails(ctx, id);
  }
}
