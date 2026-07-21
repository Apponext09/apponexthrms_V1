import { v4 as uuidv4 } from 'uuid';
import { PIPRepository, PIPGoalRepository, PIPReviewRepository } from '../repositories/PIPRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class PIPService {
  private pipRepo: PIPRepository;
  private goalRepo: PIPGoalRepository;
  private reviewRepo: PIPReviewRepository;
  private auditService: AuditService;

  constructor() {
    this.pipRepo = new PIPRepository();
    this.goalRepo = new PIPGoalRepository();
    this.reviewRepo = new PIPReviewRepository();
    this.auditService = new AuditService();
  }

  /**
   * Create Performance Improvement Plan
   */
  async createPIP(ctx: TenantContext, input: {
    employeeId: number;
    startDate: string;
    endDate: string;
    reason: string;
  }) {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (endDate <= startDate) {
      throw new ValidationError('End date must be after start date');
    }

    // Check if employee already has active PIP
    const hasActivePIP = await this.pipRepo.hasActivePIP(ctx, input.employeeId);
    if (hasActivePIP) {
      throw new ValidationError('Employee already has an active PIP');
    }

    const pip = await this.pipRepo.create(ctx, {
      uuid: uuidv4(),
      employee_id: input.employeeId,
      start_date: input.startDate,
      end_date: input.endDate,
      reason: input.reason,
      status: 'active',
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'PIP',
      entityId: pip.id,
      afterState: { employeeId: input.employeeId, reason: input.reason },
    });

    return pip;
  }

  /**
   * Add goal to PIP
   */
  async addGoal(ctx: TenantContext, input: {
    pipId: number;
    goalDescription: string;
    targetDate: string;
  }) {
    const pip = await this.pipRepo.getById(ctx, input.pipId);
    if (!pip) {
      throw new NotFoundError('PIP not found');
    }

    const goal = await this.goalRepo.create(ctx, {
      uuid: uuidv4(),
      pip_id: input.pipId,
      goal_description: input.goalDescription,
      target_date: input.targetDate,
      status: 'pending',
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'PIP_GOAL',
      entityId: goal.id,
      afterState: { description: input.goalDescription },
    });

    return goal;
  }

  /**
   * Create PIP review
   */
  async createReview(ctx: TenantContext, input: {
    pipId: number;
    reviewDate: string;
    status: string;
    notes?: string;
  }) {
    const pip = await this.pipRepo.getById(ctx, input.pipId);
    if (!pip) {
      throw new NotFoundError('PIP not found');
    }

    const review = await this.reviewRepo.create(ctx, {
      uuid: uuidv4(),
      pip_id: input.pipId,
      review_date: input.reviewDate,
      status: input.status,
      notes: input.notes || null,
    } as any);

    // If review is passed/failed, update PIP status
    if (input.status === 'passed' || input.status === 'failed') {
      await this.pipRepo.update(ctx, input.pipId, { status: input.status });
    }

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'PIP_REVIEW',
      entityId: review.id,
      afterState: { status: input.status },
    });

    return review;
  }

  /**
   * Get PIP
   */
  async getPIP(ctx: TenantContext, pipId: number) {
    const pip = await this.pipRepo.getById(ctx, pipId);
    if (!pip) {
      throw new NotFoundError('PIP not found');
    }
    return pip;
  }

  /**
   * Get PIP with goals and reviews
   */
  async getPIPWithDetails(ctx: TenantContext, pipId: number) {
    const pip = await this.getPIP(ctx, pipId);
    const goals = await this.goalRepo.getForPIP(ctx, pipId);
    const reviews = await this.reviewRepo.getForPIP(ctx, pipId);

    return {
      ...pip,
      goals: goals.items,
      reviews: reviews.items,
    };
  }

  /**
   * Get employee PIPs
   */
  async getEmployeePIPs(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.pipRepo.getForEmployee(ctx, employeeId, options);
  }

  /**
   * Get PIP progress
   */
  async getPIPProgress(ctx: TenantContext, pipId: number) {
    const pip = await this.getPIP(ctx, pipId);
    const goals = await this.goalRepo.getForPIP(ctx, pipId);
    const achievedGoals = await this.goalRepo.countAchievedGoals(ctx, pipId);

    return {
      pipId,
      totalGoals: goals.items.length,
      achievedGoals,
      progress: goals.items.length > 0 ? (achievedGoals / goals.items.length) * 100 : 0,
    };
  }

  /**
   * Update goal status
   */
  async updateGoalStatus(ctx: TenantContext, goalId: number, status: string) {
    const goal = await this.goalRepo.getById(ctx, goalId);
    if (!goal) {
      throw new NotFoundError('PIP goal not found');
    }

    return this.goalRepo.update(ctx, goalId, { status });
  }

  /**
   * Mark PIP as completed
   */
  async completePIP(ctx: TenantContext, pipId: number) {
    return this.pipRepo.update(ctx, pipId, { status: 'completed' });
  }
}
