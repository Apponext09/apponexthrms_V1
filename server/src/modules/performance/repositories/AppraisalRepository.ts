import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface Appraisal {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  cycle_id: number;
  overall_rating: number | null;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AppraisalRating {
  id: number;
  uuid: string;
  organization_id: number;
  appraisal_id: number;
  competency_id: number;
  rating: number;
  created_at: string;
  deleted_at: string | null;
}

export class AppraisalRepository extends BaseRepository<Appraisal> {
  constructor() {
    super('appraisals');
  }

  /**
   * Get appraisals by employee
   */
  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get appraisals by cycle
   */
  async getByCycle(ctx: TenantContext, cycleId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { cycle_id: cycleId },
    });
  }

  /**
   * Get appraisals by status
   */
  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status },
    });
  }

  /**
   * Check if appraisal exists for employee in cycle
   */
  async existsForEmployeeInCycle(ctx: TenantContext, employeeId: number, cycleId: number): Promise<boolean> {
    const appraisal = await this.getByFields(ctx, {
      employee_id: employeeId,
      cycle_id: cycleId,
    });
    return !!appraisal;
  }
}

export class AppraisalRatingRepository extends BaseRepository<AppraisalRating> {
  constructor() {
    super('appraisal_ratings');
  }

  /**
   * Get ratings by appraisal
   */
  async getByAppraisal(ctx: TenantContext, appraisalId: number) {
    return this.list(ctx, {
      filters: { appraisal_id: appraisalId },
    });
  }

  /**
   * Calculate average rating for appraisal
   */
  async calculateAverageRating(ctx: TenantContext, appraisalId: number): Promise<number> {
    const ratings = await this.getByAppraisal(ctx, appraisalId);
    if (ratings.items.length === 0) return 0;

    const sum = ratings.items.reduce((acc, r) => acc + r.rating, 0);
    return sum / ratings.items.length;
  }
}
