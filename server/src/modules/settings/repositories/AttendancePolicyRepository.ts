import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface AttendancePolicy {
  id: number;
  uuid: string;
  organization_id: number;
  name: string;
  code: string;
  is_default: boolean;
  working_hours_per_day: number;
  grace_period_minutes: number;
  overtime_enabled: boolean;
  overtime_rules: any;
  shift_policies: any;
  status: 'active' | 'inactive';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class AttendancePolicyRepository extends BaseRepository<AttendancePolicy> {
  constructor() {
    super('attendance_policies');
  }

  /**
   * Get default attendance policy
   */
  async getDefault(ctx: TenantContext): Promise<AttendancePolicy | null> {
    return this.query(ctx).where('is_default', true).first() as Promise<AttendancePolicy | null>;
  }

  /**
   * Get policy by code
   */
  async getByCode(ctx: TenantContext, code: string): Promise<AttendancePolicy | null> {
    return this.query(ctx).where('code', code).first() as Promise<AttendancePolicy | null>;
  }

  /**
   * Check if code exists within organization
   */
  async isCodeUnique(ctx: TenantContext, code: string, excludeId?: number): Promise<boolean> {
    let query = this.query(ctx).where('code', code);
    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }
    const result = await query.first();
    return !result;
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return ['name', 'code'];
  }
}
