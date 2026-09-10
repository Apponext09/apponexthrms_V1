import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface WorkflowCondition {
  id: number;
  uuid: string;
  organization_id: number;
  workflow_id: number;
  condition_type: string;
  field_name: string | null;
  operator: string;
  value: string | null;
  next_step_id: number | null;
  description: string | null;
  created_by: number;
  updated_by: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export class WorkflowConditionRepository extends BaseRepository<WorkflowCondition> {
  constructor() {
    super('workflow_conditions');
  }

  async listByWorkflow(ctx: TenantContext, workflowId: number, page = 1, pageSize = 100) {
    return this.list(ctx, {
      page,
      pageSize,
      filters: { workflow_id: workflowId },
      sortBy: 'created_at',
      sortOrder: 'asc',
    });
  }

  async getConditionsForStep(ctx: TenantContext, workflowId: number): Promise<WorkflowCondition[]> {
    return this.query(ctx)
      .where('workflow_id', workflowId)
      .orderBy('created_at', 'asc');
  }
}
