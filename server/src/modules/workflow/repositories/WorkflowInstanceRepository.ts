import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface WorkflowInstance {
  id: number;
  uuid: string;
  organization_id: number;
  workflow_id: number;
  entity_type: string;
  entity_id: number;
  initiator_id: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'reopened';
  current_step_number: number | null;
  approval_count: number;
  rejection_count: number;
  started_at: Date;
  completed_at: Date | null;
  completion_status: 'approved' | 'rejected' | 'cancelled' | null;
  metadata: Record<string, any> | null;
  created_by: number;
  updated_by: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export class WorkflowInstanceRepository extends BaseRepository<WorkflowInstance> {
  constructor() {
    super('workflow_instances');
  }

  protected getSearchableFields(): string[] {
    return ['entity_type'];
  }

  async getByEntity(
    ctx: TenantContext,
    entityType: string,
    entityId: number
  ): Promise<WorkflowInstance | null> {
    return this.getByFields(ctx, {
      entity_type: entityType,
      entity_id: entityId,
    });
  }

  async listByWorkflow(ctx: TenantContext, workflowId: number, page = 1, pageSize = 20) {
    return this.list(ctx, {
      page,
      pageSize,
      filters: { workflow_id: workflowId },
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  }

  async listPendingByInitiator(ctx: TenantContext, initiatorId: number, page = 1, pageSize = 20) {
    return this.list(ctx, {
      page,
      pageSize,
      filters: { initiator_id: initiatorId, status: 'pending' },
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  }

  async listByStatus(ctx: TenantContext, status: string, page = 1, pageSize = 20) {
    return this.list(ctx, {
      page,
      pageSize,
      filters: { status },
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  }

  async getPendingInstance(ctx: TenantContext, workflowId: number, entityId: number) {
    return this.getByFields(ctx, {
      workflow_id: workflowId,
      entity_id: entityId,
      status: 'pending',
    });
  }
}
