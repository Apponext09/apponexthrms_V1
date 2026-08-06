import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface OvertimeRequest {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  overtime_date: string;
  overtime_hours: number;
  overtime_type: 'extra_hours' | 'weekend_work' | 'holiday_work';
  reason_description: string | null;
  workflow_instance_id: number | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by: number | null;
  approval_date: string | null;

  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class OvertimeRequestRepository extends BaseRepository<OvertimeRequest> {
  constructor() {
    super('overtime_requests');
  }

  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
      sortBy: 'overtime_date',
      sortOrder: 'desc',
    });
  }

  async getPendingRequests(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { approval_status: 'pending' },
      sortBy: 'created_at',
      sortOrder: 'asc',
    });
  }

  async getApprovedRequests(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId, approval_status: 'approved' },
      sortBy: 'overtime_date',
      sortOrder: 'desc',
    });
  }

  protected getSearchableFields(): string[] {
    return ['reason_description'];
  }
}
