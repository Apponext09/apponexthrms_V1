import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface AttendanceRegularization {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  attendance_record_id: number | null;
  regularization_type: 'missed_punch' | 'late_arrival' | 'early_departure' | 'work_from_home' | 'manual_correction';
  request_date: string;
  reason_description: string | null;
  supporting_document_url: string | null;
  workflow_instance_id: number | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: number | null;
  approval_date: string | null;
  approval_comments: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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

  protected getSearchableFields(): string[] {
    return ['reason_description'];
  }
}
