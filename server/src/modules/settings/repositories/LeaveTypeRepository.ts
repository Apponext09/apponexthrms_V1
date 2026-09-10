import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface LeaveType {
  id: number;
  uuid: string;
  organization_id: number;
  leave_policy_id: number | null;
  leave_name: string;
  leave_code: string;
  annual_quota: number;
  carry_forward_enabled: boolean;
  carry_forward_limit: number | null;
  encashment_enabled: boolean;
  encashment_limit: number | null;
  sandwich_rule_enabled: boolean;
  gender_applicable: 'all' | 'male' | 'female' | 'other';
  description: string | null;
  status: 'active' | 'inactive';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class LeaveTypeRepository extends BaseRepository<LeaveType> {
  constructor() {
    super('leave_types');
    this.companyScoped = true;
  }

  /**
   * Get leave types by policy
   */
  async getByPolicy(ctx: TenantContext, policyId: number) {
    return this.query(ctx).where('leave_policy_id', policyId);
  }

  /**
   * Get leave type by code
   */
  async getByCode(ctx: TenantContext, code: string): Promise<LeaveType | null> {
    return this.query(ctx).where('leave_code', code).first() as Promise<LeaveType | null>;
  }

  /**
   * Get applicable leave types for gender
   */
  async getApplicableForGender(ctx: TenantContext, gender: string) {
    return this.query(ctx)
      .where(function (q) {
        q.where('gender_applicable', 'all').orWhere('gender_applicable', gender);
      });
  }

  /**
   * Get leaves with carry forward enabled
   */
  async getWithCarryForward(ctx: TenantContext) {
    return this.query(ctx).where('carry_forward_enabled', true);
  }

  /**
   * Check if code exists within organization
   */
  async isCodeUnique(ctx: TenantContext, code: string, excludeId?: number): Promise<boolean> {
    let query = this.query(ctx).where('leave_code', code);
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
    return ['leave_name', 'leave_code', 'description'];
  }
}
