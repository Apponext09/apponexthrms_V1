import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface WorkflowTemplate {
  id: number;
  uuid: string;
  organization_id: number;
  template_name: string;
  template_description: string | null;
  category: string;
  is_default: boolean;
  template_data: Record<string, any>;
  created_by: number;
  updated_by: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export class WorkflowTemplateRepository extends BaseRepository<WorkflowTemplate> {
  constructor() {
    super('workflow_templates');
  }

  protected getSearchableFields(): string[] {
    return ['template_name', 'template_description'];
  }

  async listByCategory(ctx: TenantContext, category: string, page = 1, pageSize = 20) {
    return this.list(ctx, {
      page,
      pageSize,
      filters: { category },
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  }

  async getDefaultTemplate(ctx: TenantContext, category: string): Promise<WorkflowTemplate | null> {
    return this.getByFields(ctx, {
      category,
      is_default: true,
    });
  }

  async listTemplates(ctx: TenantContext, page = 1, pageSize = 20) {
    return this.list(ctx, {
      page,
      pageSize,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  }
}
