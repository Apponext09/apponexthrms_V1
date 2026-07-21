import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface Workflow {
  id: number;
  uuid: string;
  organization_id: number;
  workflow_code: string;
  workflow_name: string;
  description: string | null;
  type: string;
  status: 'draft' | 'published' | 'archived';
  version_number: number;
  is_published: boolean;
  published_by: number | null;
  published_at: Date | null;
  approval_pattern: 'sequential' | 'parallel' | 'conditional';
  max_escalation_levels: number;
  sla_days: number | null;
  notify_on_completion: boolean;
  auto_approve_after_days: number | null;
  auto_reject_after_days: number | null;
  created_by: number;
  updated_by: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export class WorkflowRepository extends BaseRepository<Workflow> {
  constructor() {
    super('workflows');
  }

  protected getSearchableFields(): string[] {
    return ['workflow_name', 'workflow_code', 'description'];
  }

  async getByCode(ctx: TenantContext, code: string): Promise<Workflow | null> {
    return this.getByFields(ctx, { workflow_code: code });
  }

  async listByType(ctx: TenantContext, type: string, page = 1, pageSize = 20) {
    return this.list(ctx, {
      page,
      pageSize,
      filters: { type },
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

  async getPublished(ctx: TenantContext, id: number | string): Promise<Workflow | null> {
    const record = await this.getById(ctx, id);
    if (record && record.is_published && record.status === 'published') {
      return record;
    }
    return null;
  }
}
