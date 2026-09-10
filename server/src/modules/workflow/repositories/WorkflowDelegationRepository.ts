import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface WorkflowDelegation {
  id: number;
  uuid: string;
  organization_id: number;
  instance_step_id: number;
  delegated_from_user_id: number;
  delegated_to_user_id: number;
  delegation_reason: string | null;
  delegation_start_date: Date;
  delegation_end_date: Date;
  status: 'active' | 'expired' | 'revoked';
  created_by: number;
  updated_by: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export class WorkflowDelegationRepository extends BaseRepository<WorkflowDelegation> {
  constructor() {
    super('workflow_delegations');
  }

  async listByInstanceStep(ctx: TenantContext, instanceStepId: number) {
    return this.query(ctx)
      .where('instance_step_id', instanceStepId)
      .orderBy('created_at', 'asc');
  }

  async getActiveByInstanceStep(
    ctx: TenantContext,
    instanceStepId: number
  ): Promise<WorkflowDelegation | null> {
    return this.getByFields(ctx, {
      instance_step_id: instanceStepId,
      status: 'active',
    });
  }

  async listActiveDelegations(ctx: TenantContext, delegatedFromUserId: number) {
    return this.query(ctx)
      .where('delegated_from_user_id', delegatedFromUserId)
      .where('status', 'active')
      .orderBy('delegation_start_date', 'asc');
  }

  async getActiveDelegationForUser(
    ctx: TenantContext,
    delegatedFromUserId: number,
    delegatedToUserId: number
  ): Promise<WorkflowDelegation | null> {
    return this.getByFields(ctx, {
      delegated_from_user_id: delegatedFromUserId,
      delegated_to_user_id: delegatedToUserId,
      status: 'active',
    });
  }
}
