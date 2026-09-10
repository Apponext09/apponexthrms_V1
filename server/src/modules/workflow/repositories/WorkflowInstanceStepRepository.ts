import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface WorkflowInstanceStep {
  id: number;
  uuid: string;
  organization_id: number;
  instance_id: number;
  step_id: number;
  step_number: number;
  status: 'pending' | 'approved' | 'rejected' | 'skipped' | 'in_progress';
  approver_id: number | null;
  assigned_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  approval_action: 'approve' | 'reject' | 'delegate' | 'escalate' | null;
  approval_comment: string | null;
  approver_notes: string | null;
  created_by: number;
  updated_by: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export class WorkflowInstanceStepRepository extends BaseRepository<WorkflowInstanceStep> {
  constructor() {
    super('workflow_instance_steps');
  }

  async getByInstanceStep(
    ctx: TenantContext,
    instanceId: number,
    stepNumber: number
  ): Promise<WorkflowInstanceStep | null> {
    return this.getByFields(ctx, {
      instance_id: instanceId,
      step_number: stepNumber,
    });
  }

  async listByInstance(ctx: TenantContext, instanceId: number) {
    return this.query(ctx)
      .where('instance_id', instanceId)
      .orderBy('step_number', 'asc');
  }

  async getCurrentStep(ctx: TenantContext, instanceId: number): Promise<WorkflowInstanceStep | null> {
    const query = this.query(ctx)
      .where('instance_id', instanceId)
      .whereNull('completed_at');
    return query.orderBy('step_number', 'asc').first() || null;
  }

  async getPendingApprovals(ctx: TenantContext, approverId: number, page = 1, pageSize = 20) {
    return this.list(ctx, {
      page,
      pageSize,
      filters: {
        approver_id: approverId,
        status: 'pending',
      },
      sortBy: 'assigned_at',
      sortOrder: 'asc',
    });
  }

  async getByApprover(ctx: TenantContext, approverId: number): Promise<WorkflowInstanceStep[]> {
    return this.query(ctx)
      .where('approver_id', approverId)
      .where('status', 'pending')
      .orderBy('assigned_at', 'asc');
  }
}
