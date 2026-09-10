import { v4 as uuidv4 } from 'uuid';
import { AppraisalRepository, AppraisalRatingRepository } from '../repositories/AppraisalRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class AppraisalService {
  private appraisalRepo: AppraisalRepository;
  private ratingRepo: AppraisalRatingRepository;
  private auditService: AuditService;

  constructor() {
    this.appraisalRepo = new AppraisalRepository();
    this.ratingRepo = new AppraisalRatingRepository();
    this.auditService = new AuditService();
  }

  /**
   * Create appraisal for employee in cycle
   */
  async createAppraisal(ctx: TenantContext, input: {
    employeeId: number;
    cycleId: number;
  }) {
    const appraisal = await this.appraisalRepo.create(ctx, {
      uuid: uuidv4(),
      employee_id: input.employeeId,
      cycle_id: input.cycleId,
      status: 'draft',
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'APPRAISAL',
      entityId: appraisal.id,
      afterState: { employeeId: input.employeeId },
    });

    return appraisal;
  }

  /**
   * Add competency rating to appraisal
   */
  async addCompetencyRating(ctx: TenantContext, input: {
    appraisalId: number;
    competencyId: number;
    rating: number;
  }) {
    const appraisal = await this.appraisalRepo.getById(ctx, input.appraisalId);
    if (!appraisal) {
      throw new NotFoundError('Appraisal not found');
    }

    const rating = await this.ratingRepo.create(ctx, {
      uuid: uuidv4(),
      appraisal_id: input.appraisalId,
      competency_id: input.competencyId,
      rating: input.rating,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'APPRAISAL_RATING',
      entityId: rating.id,
      afterState: { rating: input.rating },
    });

    return rating;
  }

  /**
   * Get appraisal
   */
  async getAppraisal(ctx: TenantContext, appraisalId: number) {
    const appraisal = await this.appraisalRepo.getById(ctx, appraisalId);
    if (!appraisal) {
      throw new NotFoundError('Appraisal not found');
    }
    return appraisal;
  }

  /**
   * Get appraisal with ratings
   */
  async getAppraisalWithRatings(ctx: TenantContext, appraisalId: number) {
    const appraisal = await this.getAppraisal(ctx, appraisalId);
    const ratings = await this.ratingRepo.getByAppraisal(ctx, appraisalId);

    return {
      ...appraisal,
      ratings: ratings.items,
    };
  }

  /**
   * Finalize appraisal (calculate overall rating)
   */
  async finalizeAppraisal(ctx: TenantContext, appraisalId: number) {
    const appraisal = await this.getAppraisal(ctx, appraisalId);
    const overallRating = await this.ratingRepo.calculateAverageRating(ctx, appraisalId);

    return this.appraisalRepo.update(ctx, appraisalId, {
      status: 'completed',
      overall_rating: overallRating,
    });
  }

  /**
   * Get employee appraisals
   */
  async getEmployeeAppraisals(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.appraisalRepo.getByEmployee(ctx, employeeId, options);
  }

  /**
   * Get appraisals for cycle
   */
  async getCycleAppraisals(ctx: TenantContext, cycleId: number, options?: ListQueryOptions) {
    return this.appraisalRepo.getByCycle(ctx, cycleId, options);
  }

  /**
   * Calculate average rating across appraisals
   */
  async calculateOrganizationAverageRating(ctx: TenantContext, cycleId: number): Promise<number> {
    const appraisals = await this.getCycleAppraisals(ctx, cycleId);
    const completedAppraisals = appraisals.items.filter((a) => a.status === 'completed' && a.overall_rating);

    if (completedAppraisals.length === 0) return 0;

    const sum = completedAppraisals.reduce((acc, a) => acc + (a.overall_rating || 0), 0);
    return sum / completedAppraisals.length;
  }
}
