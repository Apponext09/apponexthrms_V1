import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface SalaryRevision {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  revision_type: 'increment' | 'promotion' | 'compensation_change' | 'adjustment';
  effective_from: string;
  old_ctc: number;
  new_ctc: number;
  increment_percentage: number | null;
  increment_amount: number | null;
  reason_description: string | null;
  workflow_instance_id: number | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'implemented';
  submitted_at: string | null;
  approved_by: number | null;
  approval_date: string | null;
  implemented_date: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class SalaryRevisionRepository extends BaseRepository<SalaryRevision> {
  constructor() {
    super('salary_revisions');
  }

  async getForEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions): Promise<SalaryRevision[]> {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
      orderBy: [{ field: 'created_at', direction: 'desc' }]
    });
  }

  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions): Promise<SalaryRevision[]> {
    return this.list(ctx, {
      ...options,
      filters: { status },
      orderBy: [{ field: 'created_at', direction: 'desc' }]
    });
  }

  async getPendingApprovals(ctx: TenantContext, options?: ListQueryOptions): Promise<SalaryRevision[]> {
    return this.getByStatus(ctx, 'submitted', options);
  }
}

