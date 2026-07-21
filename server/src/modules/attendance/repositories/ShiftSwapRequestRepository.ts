import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface ShiftSwapRequest {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  request_shift_date: string;
  requested_shift_id: number;
  swap_with_employee_id: number;
  swap_shift_date: string | null;
  swap_shift_id: number | null;
  reason: string | null;
  workflow_instance_id: number | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: number | null;
  approval_date: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class ShiftSwapRequestRepository extends BaseRepository<ShiftSwapRequest> {
  constructor() {
    super('shift_swap_requests');
  }

  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
      sortBy: 'request_shift_date',
      sortOrder: 'desc',
    });
  }

  async getPendingRequests(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status: 'pending' },
      sortBy: 'created_at',
      sortOrder: 'asc',
    });
  }

  async getBySwapDate(
    ctx: TenantContext,
    employeeId: number,
    date: string
  ): Promise<ShiftSwapRequest | null> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .where('request_shift_date', date)
      .whereNot('status', 'rejected')
      .first() as Promise<ShiftSwapRequest | null>;
  }

  protected getSearchableFields(): string[] {
    return ['reason'];
  }
}
