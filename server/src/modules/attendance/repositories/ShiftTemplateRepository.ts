import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface ShiftTemplate {
  id: number;
  uuid: string;
  organization_id: number;
  shift_name: string;
  shift_code: string;
  shift_type: 'fixed' | 'flexible' | 'rotational' | 'night' | 'split';
  start_time: string | null;
  end_time: string | null;
  duration_hours: number;
  grace_period_minutes: number;
  break_duration_minutes: number;
  is_night_shift: boolean;
  is_flexible: boolean;
  flexible_start_range_start: string | null;
  flexible_start_range_end: string | null;
  color: string;
  description: string | null;
  is_default: boolean;
  status: 'active' | 'inactive';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class ShiftTemplateRepository extends BaseRepository<ShiftTemplate> {
  constructor() {
    super('shift_templates');
  }

  async getByCode(ctx: TenantContext, code: string): Promise<ShiftTemplate | null> {
    return this.query(ctx).where('shift_code', code).first() as Promise<ShiftTemplate | null>;
  }

  async isCodeUnique(ctx: TenantContext, code: string, excludeId?: number): Promise<boolean> {
    let query = this.query(ctx).where('shift_code', code);
    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }
    const result = await query.first();
    return !result;
  }

  async getActiveShifts(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status: 'active' },
    });
  }

  async getDefaultShift(ctx: TenantContext): Promise<ShiftTemplate | null> {
    return this.query(ctx).where('is_default', true).first() as Promise<ShiftTemplate | null>;
  }

  async getByType(ctx: TenantContext, shiftType: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { shift_type: shiftType },
    });
  }

  protected getSearchableFields(): string[] {
    return ['shift_name', 'shift_code', 'description'];
  }
}
