import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';
import { v4 as uuidv4 } from 'uuid';

export interface WeeklyOffRule {
  id: number;
  uuid: string;
  organization_id: number | null;
  calendar_id: number;
  week_day: string;
  off_type: 'Full Day' | 'Half Day' | string;
  is_alternate: boolean;
  alternate_weeks: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class WeeklyOffRuleRepository extends BaseRepository<WeeklyOffRule> {
  constructor() {
    super('weekly_off_rules');
  }

  /**
   * Set or replace weekly off rules for a calendar
   */
  async setWeeklyOffRules(
    ctx: TenantContext,
    calendarId: number | string,
    rules: Array<{
      week_day: string;
      off_type?: string;
      is_alternate?: boolean;
      alternate_weeks?: string | null;
    }>
  ): Promise<WeeklyOffRule[]> {
    const numCalId = Number(calendarId);
    const userId = ctx.userId ? Number(ctx.userId) : 1;

    // Delete existing rules for this calendar
    await this.db('weekly_off_rules').where('calendar_id', numCalId).delete();

    if (!rules || rules.length === 0) {
      return [];
    }

    const rowsToInsert = rules.map((r) => ({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      calendar_id: numCalId,
      week_day: r.week_day,
      off_type: r.off_type || 'Full Day',
      is_alternate: !!r.is_alternate,
      alternate_weeks: r.alternate_weeks || null,
      created_by: userId,
      updated_by: userId,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    }));

    await this.db('weekly_off_rules').insert(rowsToInsert);

    const inserted = await this.db('weekly_off_rules')
      .where('calendar_id', numCalId)
      .orderBy('id', 'asc');

    return inserted.map((w: any) => ({
      id: w.id,
      uuid: w.uuid,
      organization_id: w.organizationId || w.organization_id,
      calendar_id: w.calendarId || w.calendar_id,
      week_day: w.weekDay || w.week_day,
      off_type: w.offType || w.off_type,
      is_alternate: !!(w.isAlternate ?? w.is_alternate),
      alternate_weeks: w.alternateWeeks || w.alternate_weeks,
      created_by: w.createdBy || w.created_by,
      updated_by: w.updatedBy || w.updated_by,
      created_at: w.createdAt || w.created_at,
      updated_at: w.updatedAt || w.updated_at,
      deleted_at: w.deletedAt || w.deleted_at,
    }));
  }

  /**
   * Get weekly off rules for a calendar
   */
  async getByCalendarId(ctx: TenantContext, calendarId: number | string): Promise<WeeklyOffRule[]> {
    const rules = await this.db('weekly_off_rules')
      .where('calendar_id', Number(calendarId))
      .whereNull('deleted_at')
      .orderBy('id', 'asc');

    return rules.map((w: any) => ({
      id: w.id,
      uuid: w.uuid,
      organization_id: w.organizationId || w.organization_id,
      calendar_id: w.calendarId || w.calendar_id,
      week_day: w.weekDay || w.week_day,
      off_type: w.offType || w.off_type,
      is_alternate: !!(w.isAlternate ?? w.is_alternate),
      alternate_weeks: w.alternateWeeks || w.alternate_weeks,
      created_by: w.createdBy || w.created_by,
      updated_by: w.updatedBy || w.updated_by,
      created_at: w.createdAt || w.created_at,
      updated_at: w.updatedAt || w.updated_at,
      deleted_at: w.deletedAt || w.deleted_at,
    }));
  }
}
