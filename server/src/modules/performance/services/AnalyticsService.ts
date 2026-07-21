import { v4 as uuidv4 } from 'uuid';
import { AnalyticsRepository } from '../repositories/AnalyticsRepository';
import { PerformanceReviewRepository } from '../repositories/ReviewRepository';
import { GoalRepository } from '../repositories/GoalRepository';
import { AppraisalRepository } from '../repositories/AppraisalRepository';
import { AuditService } from '../../audit/audit.service';
import type { TenantContext } from '../../../db/types';

export class AnalyticsService {
  private analyticsRepo: AnalyticsRepository;
  private reviewRepo: PerformanceReviewRepository;
  private goalRepo: GoalRepository;
  private appraisalRepo: AppraisalRepository;
  private auditService: AuditService;

  constructor() {
    this.analyticsRepo = new AnalyticsRepository();
    this.reviewRepo = new PerformanceReviewRepository();
    this.goalRepo = new GoalRepository();
    this.appraisalRepo = new AppraisalRepository();
    this.auditService = new AuditService();
  }

  /**
   * Generate performance dashboard metrics
   */
  async generateDashboardMetrics(ctx: TenantContext) {
    const goals = await this.goalRepo.list(ctx, { pageSize: 1000 });
    const appraisals = await this.appraisalRepo.list(ctx, { pageSize: 1000 });
    const reviews = await this.reviewRepo.list(ctx, { pageSize: 1000 });

    const metrics = {
      totalGoals: goals.meta.total,
      completedGoals: goals.items.filter((g) => g.status === 'completed').length,
      activeGoals: goals.items.filter((g) => g.status === 'active').length,
      totalAppraisals: appraisals.meta.total,
      completedAppraisals: appraisals.items.filter((a) => a.status === 'completed').length,
      averageAppraisalRating: this.calculateAverageRating(appraisals.items),
      reviewsCompleted: reviews.items.filter((r) => r.status === 'approved').length,
      generatedAt: new Date().toISOString(),
    };

    await this.analyticsRepo.upsertCache(ctx, 'dashboard_metrics', metrics, ctx.userId);
    return metrics;
  }

  /**
   * Generate goal progress report
   */
  async generateGoalProgressReport(ctx: TenantContext, employeeId?: number) {
    let query: any = { pageSize: 1000 };
    if (employeeId) {
      query.filters = { employee_id: employeeId };
    }

    const goals = await this.goalRepo.list(ctx, query);

    const report = {
      totalGoals: goals.items.length,
      byStatus: {
        draft: goals.items.filter((g) => g.status === 'draft').length,
        active: goals.items.filter((g) => g.status === 'active').length,
        completed: goals.items.filter((g) => g.status === 'completed').length,
        cancelled: goals.items.filter((g) => g.status === 'cancelled').length,
      },
      averageProgress: goals.items.length > 0
        ? goals.items.reduce((sum, g) => sum + g.progress, 0) / goals.items.length
        : 0,
      byCategory: this.groupByCategory(goals.items),
      generatedAt: new Date().toISOString(),
    };

    await this.analyticsRepo.upsertCache(ctx, `goal_progress_${employeeId || 'all'}`, report, ctx.userId);
    return report;
  }

  /**
   * Generate talent matrix
   */
  async generateTalentMatrix(ctx: TenantContext) {
    const appraisals = await this.appraisalRepo.list(ctx, { pageSize: 1000 });

    const matrix = {
      superstars: [] as any[],
      risingStars: [] as any[],
      solidPerformers: [] as any[],
      emerging: [] as any[],
      generatedAt: new Date().toISOString(),
    };

    for (const appraisal of appraisals.items) {
      if (!appraisal.overall_rating) continue;

      // Dummy potential score calculation
      const potential = appraisal.overall_rating; // In reality, would use other metrics

      if (appraisal.overall_rating >= 80 && potential >= 80) {
        matrix.superstars.push({ employeeId: appraisal.employee_id, rating: appraisal.overall_rating });
      } else if (appraisal.overall_rating >= 70 && potential >= 70) {
        matrix.risingStars.push({ employeeId: appraisal.employee_id, rating: appraisal.overall_rating });
      } else if (appraisal.overall_rating >= 60) {
        matrix.solidPerformers.push({ employeeId: appraisal.employee_id, rating: appraisal.overall_rating });
      } else {
        matrix.emerging.push({ employeeId: appraisal.employee_id, rating: appraisal.overall_rating });
      }
    }

    await this.analyticsRepo.upsertCache(ctx, 'talent_matrix', matrix, ctx.userId);
    return matrix;
  }

  /**
   * Generate review cycle report
   */
  async generateReviewCycleReport(ctx: TenantContext, cycleId: number) {
    const reviews = await this.reviewRepo.getByCycle(ctx, cycleId);

    const report = {
      cycleId,
      totalReviews: reviews.meta.total,
      completedReviews: reviews.items.filter((r) => r.status === 'approved').length,
      pendingReviews: reviews.items.filter((r) => r.status === 'draft').length,
      averageRating: this.calculateAverageRating(reviews.items),
      generatedAt: new Date().toISOString(),
    };

    await this.analyticsRepo.upsertCache(ctx, `review_cycle_${cycleId}`, report, ctx.userId);
    return report;
  }

  /**
   * Get cached metric
   */
  async getMetric(ctx: TenantContext, metricType: string) {
    const cache = await this.analyticsRepo.getByMetricType(ctx, metricType);
    if (!cache) return null;

    // Check if cache is stale (> 1 hour)
    if (this.analyticsRepo.isStale(cache.generated_at, 60)) {
      return null; // Return null if stale, trigger regeneration
    }

    return cache.metric_data;
  }

  /**
   * Private helper: Calculate average rating
   */
  private calculateAverageRating(items: any[]): number {
    const rated = items.filter((i) => i.overall_rating);
    if (rated.length === 0) return 0;
    const sum = rated.reduce((acc, i) => acc + (i.overall_rating || 0), 0);
    return sum / rated.length;
  }

  /**
   * Private helper: Group goals by category
   */
  private groupByCategory(goals: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const goal of goals) {
      grouped[goal.category] = (grouped[goal.category] || 0) + 1;
    }
    return grouped;
  }
}
