import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface WorkPolicy {
  id: number;
  uuid: string;
  organization_id: number;
  policy_name: string;
  policy_type: 'office' | 'hybrid' | 'remote';
  applicable_to_all: boolean;
  rules: any;
  effective_from: string;
  effective_to: string | null;
  description: string | null;
  status: 'active' | 'inactive';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class WorkPolicyRepository extends BaseRepository<WorkPolicy> {
  constructor() {
    super('work_policies');
  }

  /**
   * Get active policies for a given date
   */
  async getActiveForDate(ctx: TenantContext, date: string) {
    return this.query(ctx)
      .where('effective_from', '<=', date)
      .where(function (q) {
        q.whereNull('effective_to').orWhere('effective_to', '>=', date);
      })
      .where('status', 'active');
  }

  /**
   * Get policies by type
   */
  async getByType(ctx: TenantContext, type: 'office' | 'hybrid' | 'remote') {
    return this.query(ctx).where('policy_type', type);
  }

  /**
   * Get applicable to all policies
   */
  async getApplicableToAll(ctx: TenantContext) {
    return this.query(ctx).where('applicable_to_all', true);
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return ['policy_name', 'description'];
  }
}
