import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface LeaveApplicationDay {
  id: number;
  uuid: string;
  organization_id: number;
  application_id: number;
  leave_date: string;
  day_type: 'full_day' | 'half_day_first_half' | 'half_day_second_half';
  is_holiday: boolean;
  is_weekend: boolean;
  status: 'approved' | 'rejected' | 'pending';
  notes: string | null;
  created_at: string;
}

export class LeaveApplicationDayRepository extends BaseRepository<LeaveApplicationDay> {
  constructor() {
    super('leave_application_days');
  }

  /**
   * Get days for application
   */
  async getForApplication(ctx: TenantContext, applicationId: number): Promise<LeaveApplicationDay[]> {
    return this.query(ctx)
      .where('application_id', applicationId)
      .orderBy('leave_date', 'asc') as Promise<LeaveApplicationDay[]>;
  }

  /**
   * Get approved days count
   */
  async countApprovedDays(ctx: TenantContext, applicationId: number): Promise<number> {
    const result = await this.query(ctx)
      .where('application_id', applicationId)
      .where('status', 'approved')
      .count('id as total')
      .first() as any;
    return result?.total || 0;
  }

  /**
   * Create bulk days
   */
  async createBulk(ctx: TenantContext, days: Omit<LeaveApplicationDay, 'id' | 'uuid' | 'created_at'>[]): Promise<void> {
    const { v4: uuidv4 } = await import('uuid');
    const records = days.map((day) => ({
      ...day,
      uuid: uuidv4(),
      created_at: new Date().toISOString(),
    }));
    await this.query(ctx).insert(records);
  }
}
