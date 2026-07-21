import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface Holiday {
  id: number;
  uuid: string;
  organization_id: number;
  holiday_calendar_id: number;
  holiday_name: string;
  holiday_date: string;
  holiday_type: 'national' | 'regional' | 'company';
  is_optional: boolean;
  description: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class HolidayRepository extends BaseRepository<Holiday> {
  constructor() {
    super('holidays');
  }

  /**
   * Get holidays by calendar
   */
  async getByCalendar(ctx: TenantContext, calendarId: number) {
    return this.query(ctx)
      .where('holiday_calendar_id', calendarId)
      .orderBy('holiday_date', 'asc');
  }

  /**
   * Get holidays by date range
   */
  async getByDateRange(ctx: TenantContext, startDate: string, endDate: string) {
    return this.query(ctx)
      .where('holiday_date', '>=', startDate)
      .where('holiday_date', '<=', endDate)
      .orderBy('holiday_date', 'asc');
  }

  /**
   * Get mandatory holidays (not optional)
   */
  async getMandatoryHolidays(ctx: TenantContext, calendarId: number) {
    return this.query(ctx)
      .where('holiday_calendar_id', calendarId)
      .where('is_optional', false)
      .orderBy('holiday_date', 'asc');
  }

  /**
   * Check if date is holiday
   */
  async isHoliday(ctx: TenantContext, calendarId: number, date: string): Promise<boolean> {
    const result = await this.query(ctx)
      .where('holiday_calendar_id', calendarId)
      .where('holiday_date', date)
      .first();
    return !!result;
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return ['holiday_name', 'description'];
  }
}
