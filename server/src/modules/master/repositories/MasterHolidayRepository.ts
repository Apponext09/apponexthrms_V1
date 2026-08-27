import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';
import { v4 as uuidv4 } from 'uuid';

export interface HolidayItem {
  id: number;
  uuid: string;
  organization_id: number;
  calendar_id: number;
  holiday_calendar_id?: number;
  holiday_name: string;
  holiday_date: string;
  holiday_type: 'National' | 'Festival' | 'Optional' | 'Restricted' | string;
  is_optional: boolean;
  description: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class MasterHolidayRepository extends BaseRepository<HolidayItem> {
  constructor() {
    super('holidays');
  }

  /**
   * Find duplicate holiday date in same calendar
   */
  async findDuplicate(
    ctx: TenantContext,
    calendarId: number | string,
    holidayDate: string,
    excludeId?: number | string
  ): Promise<HolidayItem | null> {
    const formattedDate = holidayDate.split('T')[0];
    let q = this.query(ctx)
      .where((b) => b.where('calendar_id', calendarId).orWhere('holiday_calendar_id', calendarId))
      .where('holiday_date', formattedDate)
      .whereNull('deleted_at');

    if (excludeId) {
      q = q.whereNot('id', excludeId);
    }

    const row = await q.first();
    return row || null;
  }

  /**
   * Add holiday to calendar
   */
  async addHoliday(
    ctx: TenantContext,
    data: {
      calendar_id: number;
      holiday_name: string;
      holiday_date: string;
      holiday_type?: string;
      is_optional?: boolean;
      description?: string | null;
    }
  ): Promise<HolidayItem> {
    const holidayUuid = uuidv4();
    const formattedDate = data.holiday_date.split('T')[0];
    const type = data.holiday_type || 'National';
    const isOpt = !!data.is_optional;
    const userId = ctx.userId ? Number(ctx.userId) : 1;

    const [id] = await this.db('holidays').insert({
      uuid: holidayUuid,
      organization_id: ctx.organizationId,
      calendar_id: data.calendar_id,
      holiday_calendar_id: data.calendar_id,
      holiday_name: data.holiday_name,
      holiday_date: formattedDate,
      holiday_type: type,
      is_optional: isOpt,
      description: data.description ?? null,
      created_by: userId,
      updated_by: userId,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });

    const created = await this.query(ctx).where('id', id).first();
    return {
      ...created!,
      calendar_id: created?.calendarId || created?.calendar_id || created?.holidayCalendarId || data.calendar_id,
      holiday_name: created?.holidayName || created?.holiday_name || data.holiday_name,
      holiday_date: formattedDate,
      holiday_type: created?.holidayType || created?.holiday_type || type,
      is_optional: !!(created?.isOptional ?? created?.is_optional ?? isOpt),
    };
  }

  /**
   * Update holiday
   */
  async updateHoliday(
    ctx: TenantContext,
    holidayId: number | string,
    data: {
      holiday_name?: string;
      holiday_date?: string;
      holiday_type?: string;
      is_optional?: boolean;
      description?: string | null;
    }
  ): Promise<HolidayItem | null> {
    const existing = await this.query(ctx).where('id', holidayId).whereNull('deleted_at').first();
    if (!existing) return null;

    const updatePayload: any = {
      updated_by: ctx.userId ? Number(ctx.userId) : 1,
      updated_at: this.db.fn.now(),
    };

    if (data.holiday_name !== undefined) {
      updatePayload.holiday_name = data.holiday_name;
    }
    if (data.holiday_date !== undefined) {
      updatePayload.holiday_date = data.holiday_date.split('T')[0];
    }
    if (data.holiday_type !== undefined) {
      updatePayload.holiday_type = data.holiday_type;
    }
    if (data.is_optional !== undefined) {
      updatePayload.is_optional = !!data.is_optional;
    }
    if (data.description !== undefined) {
      updatePayload.description = data.description;
    }

    await this.db('holidays').where('id', holidayId).update(updatePayload);

    const updated = await this.query(ctx).where('id', holidayId).first();
    return {
      ...updated!,
      calendar_id: updated?.calendarId || updated?.calendar_id || updated?.holidayCalendarId,
      holiday_name: updated?.holidayName || updated?.holiday_name,
      holiday_date: typeof updated?.holidayDate === 'string' ? updated?.holidayDate.split('T')[0] : (updated?.holiday_date ? new Date(updated?.holiday_date).toISOString().split('T')[0] : data.holiday_date),
      holiday_type: updated?.holidayType || updated?.holiday_type,
      is_optional: !!(updated?.isOptional ?? updated?.is_optional),
    };
  }

  /**
   * Add bulk / batch holidays to a calendar
   */
  async addBulkHolidays(
    ctx: TenantContext,
    calendarId: number,
    holidays: Array<{
      holiday_name: string;
      holiday_date: string;
      holiday_type?: string;
      is_optional?: boolean;
      description?: string | null;
    }>
  ): Promise<{ inserted: number; holidays: any[] }> {
    if (!holidays || holidays.length === 0) {
      return { inserted: 0, holidays: [] };
    }

    const userId = ctx.userId ? Number(ctx.userId) : 1;
    const insertedRows: any[] = [];

    for (const h of holidays) {
      const hName = (h.holiday_name || '').trim();
      const hDate = (h.holiday_date || '').trim().split('T')[0];
      if (!hName || !hDate) continue;

      // Check if duplicate on same date exists
      const existing = await this.findDuplicate(ctx, calendarId, hDate);
      if (existing) {
        // Update existing holiday
        await this.updateHoliday(ctx, existing.id, {
          holiday_name: hName,
          holiday_type: h.holiday_type || existing.holiday_type,
          is_optional: h.is_optional !== undefined ? h.is_optional : existing.is_optional,
          description: h.description !== undefined ? h.description : existing.description,
        });
        continue;
      }

      const holidayUuid = uuidv4();
      const type = h.holiday_type || 'National';
      const isOpt = !!h.is_optional;

      const [id] = await this.db('holidays').insert({
        uuid: holidayUuid,
        organization_id: ctx.organizationId,
        calendar_id: calendarId,
        holiday_calendar_id: calendarId,
        holiday_name: hName,
        holiday_date: hDate,
        holiday_type: type,
        is_optional: isOpt,
        description: h.description ?? null,
        created_by: userId,
        updated_by: userId,
        created_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });

      insertedRows.push({
        id,
        uuid: holidayUuid,
        calendar_id: calendarId,
        holiday_name: hName,
        holiday_date: hDate,
        holiday_type: type,
        is_optional: isOpt,
        description: h.description ?? null,
      });
    }

    // Fetch all current holidays for this calendar
    const allHolidays = await this.db('holidays')
      .where((b) => b.where('calendar_id', calendarId).orWhere('holiday_calendar_id', calendarId))
      .whereNull('deleted_at')
      .orderBy('holiday_date', 'asc');

    return {
      inserted: insertedRows.length,
      holidays: allHolidays.map((h: any) => ({
        id: h.id,
        uuid: h.uuid,
        calendar_id: h.calendarId || h.calendar_id || h.holidayCalendarId || h.holiday_calendar_id,
        holiday_name: h.holidayName || h.holiday_name,
        holiday_date: typeof h.holidayDate === 'string' ? h.holidayDate.split('T')[0] : (h.holiday_date ? new Date(h.holiday_date).toISOString().split('T')[0] : h.holidayDate),
        holiday_type: h.holidayType || h.holiday_type || 'National',
        is_optional: !!(h.isOptional ?? h.is_optional),
        description: h.description,
      })),
    };
  }

  /**
   * Delete holiday
   */
  async deleteHoliday(ctx: TenantContext, holidayId: number | string): Promise<boolean> {
    const count = await this.query(ctx).where('id', holidayId).delete();
    return count > 0;
  }
}
