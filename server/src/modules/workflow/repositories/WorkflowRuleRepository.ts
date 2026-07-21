import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface WorkflowRule {
  id: number;
  uuid: string;
  organization_id: number;
  workflow_id: number;
  rule_name: string;
  rule_description: string | null;
  rule_type: string;
  condition_json: Record<string, any>;
  action_json: Record<string, any>;
  is_enabled: boolean;
  created_by: number;
  updated_by: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export class WorkflowRuleRepository extends BaseRepository<WorkflowRule> {
  constructor() {
    super('workflow_rules');
  }

  async listByWorkflow(ctx: TenantContext, workflowId: number, page = 1, pageSize = 100) {
    return this.list(ctx, {
      page,
      pageSize,
      filters: { workflow_id: workflowId, is_enabled: true },
      sortBy: 'created_at',
      sortOrder: 'asc',
    });
  }

  async getEnabledRules(ctx: TenantContext, workflowId: number): Promise<WorkflowRule[]> {
    return this.query(ctx)
      .where('workflow_id', workflowId)
      .where('is_enabled', true)
      .orderBy('created_at', 'asc');
  }

  async getRulesByType(
    ctx: TenantContext,
    workflowId: number,
    ruleType: string
  ): Promise<WorkflowRule[]> {
    return this.query(ctx)
      .where('workflow_id', workflowId)
      .where('rule_type', ruleType)
      .where('is_enabled', true)
      .orderBy('created_at', 'asc');
  }
}
