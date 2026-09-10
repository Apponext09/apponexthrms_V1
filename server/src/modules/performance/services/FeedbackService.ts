import { v4 as uuidv4 } from 'uuid';
import { FeedbackRequestRepository, FeedbackResponseRepository } from '../repositories/FeedbackRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class FeedbackService {
  private requestRepo: FeedbackRequestRepository;
  private responseRepo: FeedbackResponseRepository;
  private auditService: AuditService;

  constructor() {
    this.requestRepo = new FeedbackRequestRepository();
    this.responseRepo = new FeedbackResponseRepository();
    this.auditService = new AuditService();
  }

  /**
   * Create feedback request
   */
  async createFeedbackRequest(ctx: TenantContext, input: {
    employeeId: number;
    reviewerId: number;
    cycleId: number;
    feedbackType: string;
    deadline: string;
  }) {
    const deadline = new Date(input.deadline);
    if (deadline <= new Date()) {
      throw new ValidationError('Deadline must be in the future');
    }

    const request = await this.requestRepo.create(ctx, {
      uuid: uuidv4(),
      employee_id: input.employeeId,
      reviewer_id: input.reviewerId,
      cycle_id: input.cycleId,
      feedback_type: input.feedbackType,
      deadline: input.deadline,
      status: 'pending',
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'FEEDBACK_REQUEST',
      entityId: request.id,
      afterState: { feedbackType: input.feedbackType },
    });

    return request;
  }

  /**
   * Submit feedback response
   */
  async submitFeedback(ctx: TenantContext, input: {
    feedbackRequestId: number;
    responseText: string;
    score?: number;
    isAnonymous?: boolean;
  }) {
    const request = await this.requestRepo.getById(ctx, input.feedbackRequestId);
    if (!request) {
      throw new NotFoundError('Feedback request not found');
    }

    // Check if already responded
    const hasResponse = await this.responseRepo.hasResponse(ctx, input.feedbackRequestId);
    if (hasResponse) {
      throw new ValidationError('Feedback already submitted for this request');
    }

    const response = await this.responseRepo.create(ctx, {
      uuid: uuidv4(),
      feedback_request_id: input.feedbackRequestId,
      response_text: input.responseText,
      score: input.score || null,
      is_anonymous: input.isAnonymous !== false,
    } as any);

    // Update request status
    await this.requestRepo.update(ctx, input.feedbackRequestId, { status: 'completed' });

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'FEEDBACK_RESPONSE',
      entityId: response.id,
      details: { anonymous: input.isAnonymous },
    });

    return response;
  }

  /**
   * Get feedback requests for employee
   */
  async getEmployeeFeedbackRequests(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.requestRepo.getForEmployee(ctx, employeeId, options);
  }

  /**
   * Get pending feedback requests
   */
  async getPendingRequests(ctx: TenantContext, options?: ListQueryOptions) {
    return this.requestRepo.getPending(ctx, options);
  }

  /**
   * Get feedback responses for request
   */
  async getResponses(ctx: TenantContext, requestId: number) {
    return this.responseRepo.getForRequest(ctx, requestId);
  }

  /**
   * Get 360 feedback for employee
   */
  async get360Feedback(ctx: TenantContext, employeeId: number, cycleId: number) {
    const requests = await this.requestRepo.getForEmployee(ctx, employeeId);
    const cycleRequests = requests.items.filter((r) => r.cycle_id === cycleId && r.feedback_type === '360');

    const feedback: any[] = [];
    for (const request of cycleRequests) {
      const responses = await this.getResponses(ctx, request.id);
      feedback.push({
        request,
        responses: responses.items,
      });
    }

    return feedback;
  }

  /**
   * Calculate average feedback score
   */
  async getAverageFeedbackScore(ctx: TenantContext, requestId: number): Promise<number> {
    const responses = await this.getResponses(ctx, requestId);
    const scoresResponse = responses.items.filter((r) => r.score !== null);
    if (scoresResponse.length === 0) return 0;

    const sum = scoresResponse.reduce((acc, r) => acc + (r.score || 0), 0);
    return sum / scoresResponse.length;
  }
}
