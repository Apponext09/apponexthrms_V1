import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, SoftDeleteFilter } from '../../../db/types';

export interface EmployeeStatus {
  id: number;
  uuid: string;
  organization_id: number;
  name: string;
  is_probation_status: boolean;
  probation_period_value: number | null;
  probation_period_unit: string | null;
  notify_on_completion: boolean;
  is_confirmation_status: boolean;
  is_resignation_status: boolean;
  inactive_on_status_change: boolean;
  status_color: string | null;
  status: 'active' | 'inactive';
  created_by?: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export type EmployeeStatusCreate = Omit<EmployeeStatus, 'id' | 'uuid' | 'organization_id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type EmployeeStatusUpdate = Partial<EmployeeStatusCreate>;

export class EmployeeStatusRepository extends BaseRepository<EmployeeStatus> {
  constructor() {
    super('employee_statuses');
    this.companyScoped = true;
  }

  async isNameUnique(ctx: TenantContext, name: string, excludeId?: number): Promise<boolean> {
    let query = this.query(ctx).where('name', name).whereNull('deleted_at');
    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }
    const result = await query.first();
    return !result;
  }

  // The base repository already has a hardDelete method that takes TenantContext and ID!
  // We can just use that method from the service instead of soft deleting.
}
