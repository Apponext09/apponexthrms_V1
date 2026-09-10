import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface SuccessionPosition {
  id: number;
  uuid: string;
  organization_id: number;
  position_title: string;
  critical: boolean;
  num_successors: number;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Successor {
  id: number;
  uuid: string;
  organization_id: number;
  position_id: number;
  employee_id: number;
  readiness_level: 'not_ready' | 'emerging' | 'ready_now' | 'high_potential';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class SuccessionPositionRepository extends BaseRepository<SuccessionPosition> {
  constructor() {
    super('succession_positions');
  }

  /**
   * Get critical positions
   */
  async getCriticalPositions(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { critical: true },
    });
  }
}

export class SuccessorRepository extends BaseRepository<Successor> {
  constructor() {
    super('successors');
  }

  /**
   * Get successors for a position
   */
  async getForPosition(ctx: TenantContext, positionId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { position_id: positionId },
    });
  }

  /**
   * Get positions where employee is successor
   */
  async getPositionsForEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get ready successors for a position
   */
  async getReadySuccessors(ctx: TenantContext, positionId: number) {
    const successors = await this.getForPosition(ctx, positionId);
    return successors.items.filter((s) => s.readiness_level === 'ready_now');
  }

  /**
   * Get high potential successors
   */
  async getHighPotentialSuccessors(ctx: TenantContext, positionId: number) {
    const successors = await this.getForPosition(ctx, positionId);
    return successors.items.filter((s) => s.readiness_level === 'high_potential');
  }
}
