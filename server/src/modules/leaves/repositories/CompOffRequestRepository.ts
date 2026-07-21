import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface CompOffRequest {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  comp_off_id: number;
  request_date: string;
  reason: string | null;
  workflow_instance_id: number | null;
  status: 'pending' | 'approved' | 'rejected';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class CompOffRequestRepository extends BaseRepository<CompOffRequest> {
  constructor() {
    super('comp_off_requests');
  }

  /**
   * Get requests for employee
   */
  async getForEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get pending requests
   */
  async getPending(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status: 'pending' },
    });
  }

  /**
   * Get request by comp off ID
   */
  async getByCompOffId(ctx: TenantContext, compOffId: number): Promise<CompOffRequest | null> {
    return this.query(ctx)
      .where('comp_off_id', compOffId)
      .orderBy('created_at', 'desc')
      .first() as Promise<CompOffRequest | null>;
  }
}
