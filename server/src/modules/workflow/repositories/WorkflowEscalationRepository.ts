import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface WorkflowEscalation {
  id: number;
  uuid: string;
  organization_id: number;
  instance_step_id: number;
  escalated_from_user_id: number;
  escalated_to_user_id: number;
  escalation_level: number;
  escalation_reason: string | null;
  escalation_date: Date;
  status: 'pending' | 'resolved';
  created_by: number;
  updated_by: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export class WorkflowEscalationRepository extends BaseRepository<WorkflowEscalation> {
  constructor() {
    super('workflow_escalations');
  }

  async listByInstanceStep(ctx: TenantContext, instanceStepId: number) {
    return this.query(ctx)
      .where('instance_step_id', instanceStepId)
      .orderBy('escalation_level', 'asc');
  }

  async getLatestEscalation(ctx: TenantContext, instanceStepId: number): Promise<WorkflowEscalation | null> {
    const query = this.query(ctx).where('instance_step_id', instanceStepId);
    return query.orderBy('escalation_level', 'desc').first() || null;
  }

  async listPendingEscalations(ctx: TenantContext) {
    return this.query(ctx)
      .where('status', 'pending')
      .orderBy('escalation_date', 'asc');
  }

  async getByEscalatedToUser(ctx: TenantContext, userId: number) {
    return this.query(ctx)
      .where('escalated_to_user_id', userId)
      .where('status', 'pending')
      .orderBy('escalation_date', 'asc');
  }
}
