import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface WorkflowAction {
  id: number;
  uuid: string;
  organization_id: number;
  instance_id: number;
  action_type: string;
  action_target: string | null;
  action_params: Record<string, any> | null;
  status: 'pending' | 'completed' | 'failed';
  executed_at: Date | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export class WorkflowActionRepository extends BaseRepository<WorkflowAction> {
  constructor() {
    super('workflow_actions');
  }

  async listByInstance(ctx: TenantContext, instanceId: number) {
    return this.query(ctx)
      .where('instance_id', instanceId)
      .orderBy('created_at', 'asc');
  }

  async listPendingActions(ctx: TenantContext) {
    return this.query(ctx)
      .where('status', 'pending')
      .orderBy('created_at', 'asc');
  }

  async getByInstanceAndType(ctx: TenantContext, instanceId: number, actionType: string) {
    return this.query(ctx)
      .where('instance_id', instanceId)
      .where('action_type', actionType)
      .orderBy('created_at', 'desc');
  }
}
