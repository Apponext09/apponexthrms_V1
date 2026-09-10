import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface OKRObjective {
  id: number;
  uuid: string;
  organization_id: number;
  title: string;
  description: string | null;
  aligned_to_goal_id: number | null;
  owner_id: number;
  status: 'planning' | 'active' | 'completed' | 'abandoned';
  start_date: string;
  end_date: string;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OKRKeyResult {
  id: number;
  uuid: string;
  organization_id: number;
  okr_id: number;
  description: string;
  target_value: number;
  current_value: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  weight: number;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class OKRObjectiveRepository extends BaseRepository<OKRObjective> {
  constructor() {
    super('okr_objectives');
  }

  /**
   * Get OKRs by owner
   */
  async getByOwner(ctx: TenantContext, ownerId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { owner_id: ownerId },
    });
  }

  /**
   * Get OKRs by status
   */
  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status },
    });
  }

  /**
   * Get active OKRs
   */
  async getActiveOKRs(ctx: TenantContext) {
    return this.list(ctx, {
      filters: { status: 'active' },
    });
  }
}

export class OKRKeyResultRepository extends BaseRepository<OKRKeyResult> {
  constructor() {
    super('okr_key_results');
  }

  /**
   * Get key results by OKR
   */
  async getByOKR(ctx: TenantContext, okrId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { okr_id: okrId },
    });
  }

  /**
   * Get key results by status
   */
  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status },
    });
  }

  /**
   * Calculate OKR completion percentage
   */
  async calculateCompletion(ctx: TenantContext, okrId: number): Promise<number> {
    const keyResults = await this.getByOKR(ctx, okrId);
    if (keyResults.items.length === 0) return 0;

    const totalCompletion = keyResults.items.reduce((sum, kr) => {
      return sum + ((kr.current_value / kr.target_value) * 100);
    }, 0);

    return Math.min(100, totalCompletion / keyResults.items.length);
  }
}
