import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface HolidayCalendar {
  id: number;
  uuid: string;
  organization_id: number;
  name: string;
  year: number;
  description: string | null;
  is_default: boolean;
  status: 'active' | 'inactive';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class HolidayCalendarRepository extends BaseRepository<HolidayCalendar> {
  constructor() {
    super('holiday_calendars');
  }

  /**
   * Get default calendar for organization
   */
  async getDefaultCalendar(ctx: TenantContext): Promise<HolidayCalendar | null> {
    return this.query(ctx).where('is_default', true).first() as Promise<HolidayCalendar | null>;
  }

  /**
   * Get calendar by year
   */
  async getByYear(ctx: TenantContext, year: number) {
    return this.query(ctx).where('year', year);
  }

  /**
   * Get current year calendar
   */
  async getCurrentYearCalendar(ctx: TenantContext): Promise<HolidayCalendar | null> {
    const currentYear = new Date().getFullYear();
    return this.query(ctx).where('year', currentYear).first() as Promise<HolidayCalendar | null>;
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return ['name', 'description'];
  }
}
