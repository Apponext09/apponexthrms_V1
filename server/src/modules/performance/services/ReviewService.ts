import { v4 as uuidv4 } from 'uuid';
import {
  ReviewCycleRepository,
  ReviewTemplateRepository,
  PerformanceReviewRepository,
  ReviewResponseRepository,
} from '../repositories/ReviewRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class ReviewService {
  private cycleRepo: ReviewCycleRepository;
  private templateRepo: ReviewTemplateRepository;
  private reviewRepo: PerformanceReviewRepository;
  private responseRepo: ReviewResponseRepository;
  private auditService: AuditService;

  constructor() {
    this.cycleRepo = new ReviewCycleRepository();
    this.templateRepo = new ReviewTemplateRepository();
    this.reviewRepo = new PerformanceReviewRepository();
    this.responseRepo = new ReviewResponseRepository();
    this.auditService = new AuditService();
  }

  /**
   * Create review cycle
   */
  async createCycle(ctx: TenantContext, input: {
    name: string;
    cycleType: string;
    startDate: string;
    endDate: string;
  }) {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (endDate <= startDate) {
      throw new ValidationError('End date must be after start date');
    }

    const cycle = await this.cycleRepo.create(ctx, {
      uuid: uuidv4(),
      name: input.name,
      cycle_type: input.cycleType,
      start_date: input.startDate,
      end_date: input.endDate,
      status: 'planning',
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'REVIEW_CYCLE',
      entityId: cycle.id,
      afterState: { name: input.name, cycleType: input.cycleType },
    });

    return cycle;
  }

  /**
   * Create review template for cycle
   */
  async createTemplate(ctx: TenantContext, input: {
    cycleId: number;
    name: string;
    sections?: any[];
    maxScore?: number;
  }) {
    const cycle = await this.cycleRepo.getById(ctx, input.cycleId);
    if (!cycle) {
      throw new NotFoundError('Review cycle not found');
    }

    const template = await this.templateRepo.create(ctx, {
      uuid: uuidv4(),
      cycle_id: input.cycleId,
      name: input.name,
      sections: input.sections || null,
      max_score: input.maxScore || 100,
      status: 'active',
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'REVIEW_TEMPLATE',
      entityId: template.id,
      afterState: { name: input.name },
    });

    return template;
  }

  /**
   * Create performance review
   */
  async createReview(ctx: TenantContext, input: {
    employeeId: number;
    reviewerId: number;
    cycleId: number;
    templateId: number;
  }) {
    const template = await this.templateRepo.getById(ctx, input.templateId);
    if (!template) {
      throw new NotFoundError('Review template not found');
    }

    const review = await this.reviewRepo.create(ctx, {
      uuid: uuidv4(),
      employee_id: input.employeeId,
      reviewer_id: input.reviewerId,
      cycle_id: input.cycleId,
      template_id: input.templateId,
      status: 'draft',
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'PERFORMANCE_REVIEW',
      entityId: review.id,
      afterState: { employeeId: input.employeeId },
    });

    return review;
  }

  /**
   * Get review
   */
  async getReview(ctx: TenantContext, reviewId: number) {
    const review = await this.reviewRepo.getById(ctx, reviewId);
    if (!review) {
      throw new NotFoundError('Performance review not found');
    }
    return review;
  }

  /**
   * Submit review
   */
  async submitReview(ctx: TenantContext, reviewId: number, overallRating: number) {
    if (overallRating < 0 || overallRating > 100) {
      throw new ValidationError('Rating must be between 0 and 100');
    }

    return this.reviewRepo.update(ctx, reviewId, {
      status: 'submitted',
      overall_rating: overallRating,
      review_date: new Date().toISOString().split('T')[0],
    });
  }

  /**
   * Approve review
   */
  async approveReview(ctx: TenantContext, reviewId: number) {
    return this.reviewRepo.update(ctx, reviewId, { status: 'approved' });
  }

  /**
   * Get reviews for employee
   */
  async getEmployeeReviews(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.reviewRepo.getByEmployee(ctx, employeeId, options);
  }

  /**
   * Get reviews for cycle
   */
  async getCycleReviews(ctx: TenantContext, cycleId: number, options?: ListQueryOptions) {
    return this.reviewRepo.getByCycle(ctx, cycleId, options);
  }

  /**
   * Activate cycle
   */
  async activateCycle(ctx: TenantContext, cycleId: number) {
    return this.cycleRepo.update(ctx, cycleId, { status: 'active' });
  }

  /**
   * Complete cycle
   */
  async completeCycle(ctx: TenantContext, cycleId: number) {
    return this.cycleRepo.update(ctx, cycleId, { status: 'completed' });
  }
}
