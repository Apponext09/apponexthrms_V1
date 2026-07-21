import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface AttendanceBreak {
  id: number;
  uuid: string;
  organization_id: number;
  attendance_record_id: number;
  break_start_time: string;
  break_end_time: string | null;
  break_duration_minutes: number | null;
  break_type: 'lunch' | 'tea' | 'personal';
  status: 'active' | 'completed';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class AttendanceBreakRepository extends BaseRepository<AttendanceBreak> {
  constructor() {
    super('attendance_breaks');
  }

  async getByRecord(ctx: TenantContext, recordId: number): Promise<AttendanceBreak[]> {
    return this.query(ctx)
      .where('attendance_record_id', recordId)
      .orderBy('break_start_time', 'asc');
  }

  async getActiveBreak(ctx: TenantContext, recordId: number): Promise<AttendanceBreak | null> {
    return this.query(ctx)
      .where('attendance_record_id', recordId)
      .where('status', 'active')
      .first() as Promise<AttendanceBreak | null>;
  }

  async getTotalBreakDuration(ctx: TenantContext, recordId: number): Promise<number> {
    const result = await this.query(ctx)
      .where('attendance_record_id', recordId)
      .where('status', 'completed')
      .sum('break_duration_minutes', { as: 'total' })
      .first();

    return (result as any)?.total || 0;
  }

  protected getSearchableFields(): string[] {
    return [];
  }
}
