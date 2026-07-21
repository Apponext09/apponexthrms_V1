import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface FeedbackRequest {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  reviewer_id: number;
  cycle_id: number;
  feedback_type: 'self' | 'peer' | 'manager' | 'direct_report' | '360';
  status: 'pending' | 'completed' | 'expired';
  deadline: string;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FeedbackResponse {
  id: number;
  uuid: string;
  organization_id: number;
  feedback_request_id: number;
  response_text: string;
  score: number | null;
  is_anonymous: boolean;
  created_at: string;
  deleted_at: string | null;
}

export class FeedbackRequestRepository extends BaseRepository<FeedbackRequest> {
  constructor() {
    super('feedback_requests');
  }

  /**
   * Get feedback requests for an employee
   */
  async getForEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get feedback requests from a reviewer
   */
  async getFromReviewer(ctx: TenantContext, reviewerId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { reviewer_id: reviewerId },
    });
  }

  /**
   * Get feedback requests by type
   */
  async getByType(ctx: TenantContext, feedbackType: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { feedback_type: feedbackType },
    });
  }

  /**
   * Get pending feedback requests
   */
  async getPending(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status: 'pending' },
    });
  }

  /**
   * Get feedback requests by cycle
   */
  async getByCycle(ctx: TenantContext, cycleId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { cycle_id: cycleId },
    });
  }
}

export class FeedbackResponseRepository extends BaseRepository<FeedbackResponse> {
  constructor() {
    super('feedback_responses');
  }

  /**
   * Get responses for a feedback request
   */
  async getForRequest(ctx: TenantContext, requestId: number) {
    return this.list(ctx, {
      filters: { feedback_request_id: requestId },
    });
  }

  /**
   * Check if response exists for request
   */
  async hasResponse(ctx: TenantContext, requestId: number): Promise<boolean> {
    const response = await this.getByFields(ctx, { feedback_request_id: requestId });
    return !!response;
  }
}
