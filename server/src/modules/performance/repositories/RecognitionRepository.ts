import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface Recognition {
  id: number;
  uuid: string;
  organization_id: number;
  recognized_by: number;
  employee_id: number;
  recognition_type: 'team_work' | 'innovation' | 'leadership' | 'customer_focus' | 'quality' | 'other';
  points_awarded: number;
  message: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface RewardPoints {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  points_balance: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class RecognitionRepository extends BaseRepository<Recognition> {
  constructor() {
    super('recognitions');
  }

  /**
   * Get recognitions for an employee
   */
  async getForEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get recognitions by type
   */
  async getByType(ctx: TenantContext, type: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { recognition_type: type },
    });
  }

  /**
   * Get recognitions by recognizer
   */
  async getByRecognizer(ctx: TenantContext, recognizedById: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { recognized_by: recognizedById },
    });
  }

  /**
   * Calculate total points for employee
   */
  async getTotalPoints(ctx: TenantContext, employeeId: number): Promise<number> {
    const recognitions = await this.getForEmployee(ctx, employeeId);
    return recognitions.items.reduce((sum, r) => sum + r.points_awarded, 0);
  }
}

export class RewardPointsRepository extends BaseRepository<RewardPoints> {
  constructor() {
    super('reward_points');
  }

  /**
   * Get reward points for employee
   */
  async getForEmployee(ctx: TenantContext, employeeId: number): Promise<RewardPoints | null> {
    return this.getByFields(ctx, {
      employee_id: employeeId,
    });
  }

  /**
   * Update points balance
   */
  async updateBalance(ctx: TenantContext, employeeId: number, pointsChange: number) {
    const current = await this.getForEmployee(ctx, employeeId);
    if (!current) {
      // Create new record if doesn't exist
      return this.create(ctx, {
        employee_id: employeeId,
        points_balance: Math.max(0, pointsChange),
      } as any);
    }

    return this.update(ctx, current.id, {
      points_balance: Math.max(0, current.points_balance + pointsChange),
    });
  }
}
