import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface ReviewCycle {
  id: number;
  uuid: string;
  organization_id: number;
  name: string;
  cycle_type: 'annual' | 'semi_annual' | 'quarterly' | 'monthly';
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'review' | 'completed' | 'archived';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ReviewTemplate {
  id: number;
  uuid: string;
  organization_id: number;
  cycle_id: number;
  name: string;
  sections: any | null;
  max_score: number;
  status: 'active' | 'inactive' | 'archived';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PerformanceReview {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  reviewer_id: number;
  cycle_id: number;
  template_id: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  overall_rating: number | null;
  review_date: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ReviewResponse {
  id: number;
  uuid: string;
  organization_id: number;
  review_id: number;
  section: string;
  response_text: string | null;
  score: number | null;
  created_at: string;
  deleted_at: string | null;
}

export class ReviewCycleRepository extends BaseRepository<ReviewCycle> {
  constructor() {
    super('review_cycles');
  }

  /**
   * Get cycles by status
   */
  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status },
    });
  }

  /**
   * Get active cycles
   */
  async getActiveCycles(ctx: TenantContext) {
    return this.list(ctx, {
      filters: { status: 'active' },
    });
  }
}

export class ReviewTemplateRepository extends BaseRepository<ReviewTemplate> {
  constructor() {
    super('review_templates');
  }

  /**
   * Get templates by cycle
   */
  async getByCycle(ctx: TenantContext, cycleId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { cycle_id: cycleId },
    });
  }

  /**
   * Get active templates
   */
  async getActiveTemplates(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status: 'active' },
    });
  }
}

export class PerformanceReviewRepository extends BaseRepository<PerformanceReview> {
  constructor() {
    super('performance_reviews');
  }

  /**
   * Get reviews by employee
   */
  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get reviews by reviewer
   */
  async getByReviewer(ctx: TenantContext, reviewerId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { reviewer_id: reviewerId },
    });
  }

  /**
   * Get reviews by cycle
   */
  async getByCycle(ctx: TenantContext, cycleId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { cycle_id: cycleId },
    });
  }

  /**
   * Get reviews by status
   */
  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status },
    });
  }
}

export class ReviewResponseRepository extends BaseRepository<ReviewResponse> {
  constructor() {
    super('review_responses');
  }

  /**
   * Get responses by review
   */
  async getByReview(ctx: TenantContext, reviewId: number) {
    return this.list(ctx, {
      filters: { review_id: reviewId },
    });
  }
}
