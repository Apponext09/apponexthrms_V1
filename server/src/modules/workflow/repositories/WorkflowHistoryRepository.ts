import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface WorkflowHistory {
  id: number;
  uuid: string;
  organization_id: number;
  instance_id: number;
  action: string;
  actor_id: number;
  actor_role: string | null;
  entity_changes: Record<string, any> | null;
  comments: string | null;
  timestamp: Date;
}

export class WorkflowHistoryRepository extends BaseRepository<WorkflowHistory> {
  constructor() {
    super('workflow_history');
  }

  async listByInstance(ctx: TenantContext, instanceId: number, page = 1, pageSize = 50) {
    return this.list(ctx, {
      page,
      pageSize,
      filters: { instance_id: instanceId },
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });
  }

  async getHistoryForInstance(ctx: TenantContext, instanceId: number): Promise<WorkflowHistory[]> {
    return this.query(ctx)
      .where('instance_id', instanceId)
      .orderBy('timestamp', 'asc');
  }

  async appendHistory(ctx: TenantContext, data: Omit<WorkflowHistory, 'id' | 'created_at' | 'updated_at'>) {
    // Append-only: just insert, don't use BaseRepository.create
    const [id] = await this.query(ctx).insert({
      ...data,
      organization_id: ctx.organizationId,
      timestamp: new Date(),
    });
    return this.getById(ctx, id);
  }
}
