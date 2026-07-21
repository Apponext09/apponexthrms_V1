import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface AttendancePoliciesMapping {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  attendance_policy_id: number;
  shift_id: number | null;
  grace_period_minutes: number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class AttendancePoliciesMappingRepository extends BaseRepository<AttendancePoliciesMapping> {
  constructor() {
    super('attendance_policies_mapping');
  }

  async getActivePolicy(ctx: TenantContext, employeeId: number): Promise<AttendancePoliciesMapping | null> {
    const today = new Date().toISOString().split('T')[0];
    return this.query(ctx)
      .where('employee_id', employeeId)
      .where('is_active', true)
      .where('effective_from', '<=', today)
      .where((q) => q.whereNull('effective_to').orWhere('effective_to', '>=', today))
      .orderBy('effective_from', 'desc')
      .first() as Promise<AttendancePoliciesMapping | null>;
  }

  async getByPolicy(ctx: TenantContext, policyId: number): Promise<AttendancePoliciesMapping[]> {
    return this.query(ctx).where('attendance_policy_id', policyId);
  }

  async getByEmployee(ctx: TenantContext, employeeId: number): Promise<AttendancePoliciesMapping[]> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .orderBy('effective_from', 'desc');
  }

  protected getSearchableFields(): string[] {
    return [];
  }
}
