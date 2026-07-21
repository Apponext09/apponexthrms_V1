import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface PipelineStage {
  id: number;
  uuid: string;
  organization_id: number;
  stage_name: string;
  sequence_order: number;
  is_rejection_stage: boolean;
  stage_color: string;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class PipelineStageRepository extends BaseRepository<PipelineStage> {
  constructor() {
    super('pipeline_stages');
  }

  async getByName(ctx: TenantContext, name: string): Promise<PipelineStage | null> {
    return this.query(ctx).where('stage_name', name).first();
  }

  async getOrdered(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      sortBy: 'sequence_order',
      sortOrder: 'asc',
    });
  }

  async getRejectionStages(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { is_rejection_stage: true },
    });
  }

  async getNextStage(ctx: TenantContext, currentStageId: number): Promise<PipelineStage | null> {
    const current = await this.getById(ctx, currentStageId);
    if (!current) return null;

    return this.query(ctx)
      .where('sequence_order', '>', current.sequence_order)
      .orderBy('sequence_order', 'asc')
      .first();
  }
}
