import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface AttendanceRegularization {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  attendance_record_id: number | null;
  request_date: string;
  requested_check_in_time: string | null;
  requested_check_out_time: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export class AttendanceRegularizationRepository extends BaseRepository<AttendanceRegularization> {
  constructor() {
    super('attendance_regularizations');
  }

  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
      sortBy: 'request_date',
      sortOrder: 'desc',
    });
  }

  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status },
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  }

  async getPendingRequests(ctx: TenantContext, options?: ListQueryOptions) {
    return this.getByStatus(ctx, 'pending', options);
  }

  async getByRecord(ctx: TenantContext, recordId: number): Promise<AttendanceRegularization | null> {
    return this.query(ctx).where('attendance_record_id', recordId).first() as Promise<AttendanceRegularization | null>;
  }

  protected override applySoftDeleteFilter(
    query: any,
    filter: any
  ): any {
    return query;
  }

  protected override getSearchableFields(): string[] {
    return ['reason'];
  }
}
