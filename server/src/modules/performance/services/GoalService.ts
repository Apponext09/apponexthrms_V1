import { v4 as uuidv4 } from 'uuid';
import { GoalRepository, type Goal } from '../repositories/GoalRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class GoalService {
  private goalRepo: GoalRepository;
  private auditService: AuditService;

  constructor() {
    this.goalRepo = new GoalRepository();
    this.auditService = new AuditService();
  }

  /**
   * Create a new goal
   */
  async createGoal(ctx: TenantContext, input: {
    employeeId: number;
    goalTemplateId?: number;
    title: string;
    description?: string;
    category: string;
    startDate: string;
    endDate: string;
    targetValue?: number;
    weight?: number;
    status?: string;
  }): Promise<Goal> {
    // Validate dates
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (endDate <= startDate) {
      throw new ValidationError('End date must be after start date');
    }

    const goal = await this.goalRepo.create(ctx, {
      uuid: uuidv4(),
      employee_id: input.employeeId,
      goal_template_id: input.goalTemplateId || null,
      title: input.title,
      description: input.description || null,
      category: input.category,
      start_date: input.startDate,
      end_date: input.endDate,
      target_value: input.targetValue || null,
      weight: input.weight || 1,
      status: input.status || 'draft',
      progress: 0,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'GOAL',
      entityId: goal.id,
      afterState: { title: input.title, category: input.category },
    });

    return goal;
  }

  /**
   * Get goal by ID
   */
  async getGoal(ctx: TenantContext, goalId: number): Promise<Goal> {
    const goal = await this.goalRepo.getById(ctx, goalId);
    if (!goal) {
      throw new NotFoundError('Goal not found');
    }
    return goal;
  }

  /**
   * List goals
   */
  async listGoals(ctx: TenantContext, options?: ListQueryOptions) {
    return this.goalRepo.list(ctx, options);
  }

  /**
   * Get goals by employee
   */
  async getEmployeeGoals(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.goalRepo.getByEmployee(ctx, employeeId, options);
  }

  /**
   * Update goal
   */
  async updateGoal(ctx: TenantContext, goalId: number, input: Partial<Goal>): Promise<Goal> {
    const goal = await this.getGoal(ctx, goalId);

    const updated = await this.goalRepo.update(ctx, goalId, input);

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'GOAL',
      entityId: goalId,
      beforeState: goal,
      afterState: updated,
    });

    return updated;
  }

  /**
   * Update goal progress
   */
  async updateProgress(ctx: TenantContext, goalId: number, progressValue: number, notes?: string): Promise<Goal> {
    const goal = await this.getGoal(ctx, goalId);

    if (progressValue < 0 || progressValue > 100) {
      throw new ValidationError('Progress must be between 0 and 100');
    }

    const updated = await this.goalRepo.update(ctx, goalId, {
      progress: progressValue,
      status: progressValue === 100 ? 'completed' : 'active',
    });

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'GOAL',
      entityId: goalId,
      details: { progress: progressValue, notes },
    });

    return updated;
  }

  /**
   * Delete goal (soft delete)
   */
  async deleteGoal(ctx: TenantContext, goalId: number): Promise<void> {
    await this.getGoal(ctx, goalId);
    await this.goalRepo.delete(ctx, goalId);

    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'GOAL',
      entityId: goalId,
    });
  }

  /**
   * Get active goals for employee
   */
  async getActiveGoals(ctx: TenantContext, employeeId: number) {
    return this.goalRepo.getActiveGoals(ctx, employeeId);
  }

  /**
   * Align goal with OKR
   */
  async alignGoalWithOKR(ctx: TenantContext, goalId: number, okrId: number): Promise<Goal> {
    const goal = await this.getGoal(ctx, goalId);

    return this.updateGoal(ctx, goalId, {
      ...goal,
    });
  }
}
