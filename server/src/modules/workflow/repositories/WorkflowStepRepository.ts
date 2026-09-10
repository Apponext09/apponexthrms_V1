import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface WorkflowStep {
  id: number;
  uuid: string;
  organization_id: number;
  workflow_id: number;
  step_number: number;
  step_name: string;
  step_description: string | null;
  approval_mode: string;
  approver_type: string;
  approver_id: number | null;
  approver_role_id: number | null;
  max_approvers: number | null;
  can_delegate: boolean;
  can_reject: boolean;
  can_reassign: boolean;
  timeout_days: number | null;
  sla_days: number | null;
  is_final_step: boolean;
  action_on_approval: string;
  action_on_rejection: string;
  notes: string | null;
  created_by: number;
  updated_by: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export class WorkflowStepRepository extends BaseRepository<WorkflowStep> {
  constructor() {
    super('workflow_steps');
  }

  async getByStepNumber(
    ctx: TenantContext,
    workflowId: number,
    stepNumber: number
  ): Promise<WorkflowStep | null> {
    return this.getByFields(ctx, {
      workflow_id: workflowId,
      step_number: stepNumber,
    });
  }

  async listByWorkflow(ctx: TenantContext, workflowId: number, page = 1, pageSize = 100) {
    return this.list(ctx, {
      page,
      pageSize,
      filters: { workflow_id: workflowId },
      sortBy: 'step_number',
      sortOrder: 'asc',
    });
  }

  async getNextStep(
    ctx: TenantContext,
    workflowId: number,
    currentStepNumber: number
  ): Promise<WorkflowStep | null> {
    const query = this.query(ctx)
      .where('workflow_id', workflowId)
      .where('step_number', '>', currentStepNumber);
    return query.orderBy('step_number', 'asc').first() || null;
  }

  async getFinalStep(ctx: TenantContext, workflowId: number): Promise<WorkflowStep | null> {
    return this.getByFields(ctx, {
      workflow_id: workflowId,
      is_final_step: true,
    });
  }

  async getAllSteps(ctx: TenantContext, workflowId: number): Promise<WorkflowStep[]> {
    return this.query(ctx)
      .where('workflow_id', workflowId)
      .orderBy('step_number', 'asc');
  }
}
