import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface WorkflowVersion {
  id: number;
  uuid: string;
  organization_id: number;
  workflow_id: number;
  version_number: number;
  status: 'draft' | 'published';
  description: string | null;
  created_by: number;
  published_by: number | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class WorkflowVersionRepository extends BaseRepository<WorkflowVersion> {
  constructor() {
    super('workflow_versions');
  }

  async getByWorkflowVersion(
    ctx: TenantContext,
    workflowId: number,
    versionNumber: number
  ): Promise<WorkflowVersion | null> {
    return this.getByFields(ctx, {
      workflow_id: workflowId,
      version_number: versionNumber,
    });
  }

  async listByWorkflow(ctx: TenantContext, workflowId: number, page = 1, pageSize = 20) {
    return this.list(ctx, {
      page,
      pageSize,
      filters: { workflow_id: workflowId },
      sortBy: 'version_number',
      sortOrder: 'desc',
    });
  }

  async getLatestVersion(ctx: TenantContext, workflowId: number): Promise<WorkflowVersion | null> {
    const query = this.query(ctx).where('workflow_id', workflowId);
    return query.orderBy('version_number', 'desc').first() || null;
  }

  async getPublishedVersion(ctx: TenantContext, workflowId: number): Promise<WorkflowVersion | null> {
    return this.getByFields(ctx, {
      workflow_id: workflowId,
      status: 'published',
    });
  }
}
