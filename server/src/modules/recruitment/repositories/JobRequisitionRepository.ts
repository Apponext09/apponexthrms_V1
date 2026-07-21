import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface JobRequisition {
  id: number;
  uuid: string;
  organization_id: number;
  requisition_code: string;
  position_title: string;
  department_id: number | null;
  headcount_count: number;
  requisition_type: 'new_position' | 'replacement_hiring';
  budget_allocated: number | null;
  hiring_justification: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  workflow_instance_id: number | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'active' | 'closed';
  approvers_chain: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class JobRequisitionRepository extends BaseRepository<JobRequisition> {
  constructor() {
    super('job_requisitions');
  }

  protected getSearchableFields(): string[] {
    return ['requisition_code', 'position_title'];
  }

  async getByCode(ctx: TenantContext, code: string): Promise<JobRequisition | null> {
    return this.query(ctx).where('requisition_code', code).first();
  }

  async isCodeUnique(ctx: TenantContext, code: string, excludeId?: number): Promise<boolean> {
    let query = this.query(ctx).where('requisition_code', code);
    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }
    const result = await query.first();
    return !result;
  }

  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status },
    });
  }

  async getByDepartment(ctx: TenantContext, departmentId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { department_id: departmentId },
    });
  }

  async getActive(ctx: TenantContext, options?: ListQueryOptions) {
    return this.getByStatus(ctx, 'active', options);
  }

  async getApproved(ctx: TenantContext, options?: ListQueryOptions) {
    const approved = await this.getByStatus(ctx, 'approved', options);
    const active = await this.getByStatus(ctx, 'active', options);
    return {
      ...approved,
      items: [...approved.items, ...active.items],
    };
  }
}
