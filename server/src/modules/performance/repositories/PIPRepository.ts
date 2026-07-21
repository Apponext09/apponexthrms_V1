import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface PerformanceImprovementPlan {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'active' | 'completed' | 'passed' | 'failed';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PIPGoal {
  id: number;
  uuid: string;
  organization_id: number;
  pip_id: number;
  goal_description: string;
  target_date: string;
  status: 'pending' | 'in_progress' | 'achieved' | 'failed';
  created_at: string;
  deleted_at: string | null;
}

export interface PIPReview {
  id: number;
  uuid: string;
  organization_id: number;
  pip_id: number;
  review_date: string;
  status: 'in_progress' | 'completed' | 'passed' | 'failed';
  notes: string | null;
  created_by: number;
  created_at: string;
  deleted_at: string | null;
}

export class PIPRepository extends BaseRepository<PerformanceImprovementPlan> {
  constructor() {
    super('performance_improvement_plans');
  }

  /**
   * Get PIPs for an employee
   */
  async getForEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get active PIPs
   */
  async getActivePIPs(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status: 'active' },
    });
  }

  /**
   * Check if employee has active PIP
   */
  async hasActivePIP(ctx: TenantContext, employeeId: number): Promise<boolean> {
    const pip = await this.getByFields(ctx, {
      employee_id: employeeId,
      status: 'active',
    });
    return !!pip;
  }
}

export class PIPGoalRepository extends BaseRepository<PIPGoal> {
  constructor() {
    super('pip_goals');
  }

  /**
   * Get goals for a PIP
   */
  async getForPIP(ctx: TenantContext, pipId: number) {
    return this.list(ctx, {
      filters: { pip_id: pipId },
    });
  }

  /**
   * Count achieved goals for PIP
   */
  async countAchievedGoals(ctx: TenantContext, pipId: number): Promise<number> {
    const goals = await this.getForPIP(ctx, pipId);
    return goals.items.filter((g) => g.status === 'achieved').length;
  }
}

export class PIPReviewRepository extends BaseRepository<PIPReview> {
  constructor() {
    super('pip_reviews');
  }

  /**
   * Get reviews for a PIP
   */
  async getForPIP(ctx: TenantContext, pipId: number) {
    return this.list(ctx, {
      filters: { pip_id: pipId },
    });
  }

  /**
   * Get latest review for a PIP
   */
  async getLatestReview(ctx: TenantContext, pipId: number): Promise<PIPReview | null> {
    const reviews = await this.getForPIP(ctx, pipId);
    return reviews.items.length > 0 ? reviews.items[0] : null;
  }
}
