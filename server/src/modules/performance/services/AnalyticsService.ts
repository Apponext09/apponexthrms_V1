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
    let goals: any = { items: [], meta: { total: 0 } };
    let appraisals: any = { items: [], meta: { total: 0 } };
    let reviews: any = { items: [], meta: { total: 0 } };
    let totalEmployees = 0;

    try {
      goals = await this.goalRepo.list(ctx, { pageSize: 1000 });
    } catch (e) {
      goals = { items: [], meta: { total: 0 } };
    }

    try {
      appraisals = await this.appraisalRepo.list(ctx, { pageSize: 1000 });
    } catch (e) {
      appraisals = { items: [], meta: { total: 0 } };
    }

    try {
      reviews = await this.reviewRepo.list(ctx, { pageSize: 1000 });
    } catch (e) {
      reviews = { items: [], meta: { total: 0 } };
    }

    try {
      const empCountRes = await this.analyticsRepo.db('employees')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .count('* as count');
      totalEmployees = Number(empCountRes?.[0]?.count || 0);
    } catch (err) {
      totalEmployees = 0;
    }

    const goalsList = Array.isArray(goals?.items) ? goals.items : [];
    const appraisalsList = Array.isArray(appraisals?.items) ? appraisals.items : [];
    const reviewsList = Array.isArray(reviews?.items) ? reviews.items : [];

    const totalGoals = goalsList.length;
    const completedGoals = goalsList.filter((g: any) => g.status === 'completed').length;
    const activeGoals = goalsList.filter((g: any) => g.status === 'active').length;
    const averageGoalProgress = totalGoals > 0
      ? Math.round(goalsList.reduce((sum: number, g: any) => sum + (Number(g.progress) || 0), 0) / totalGoals)
      : 0;

    const averageRating = this.calculateAverageRating(appraisalsList) || this.calculateAverageRating(reviewsList) || 0;
    const completedReviews = reviewsList.filter((r: any) => r.status === 'approved' || r.status === 'completed').length;
    const activeReviews = reviewsList.filter((r: any) => r.status === 'in_review' || r.status === 'draft' || r.status === 'submitted').length;
    const pendingApprovals = reviewsList.filter((r: any) => r.status === 'submitted').length +
      appraisalsList.filter((a: any) => a.status === 'submitted').length;

    const metrics = {
      totalEmployees: totalEmployees || (reviewsList.length > 0 ? reviewsList.length : 1),
      averageRating: Number(averageRating.toFixed(1)),
      averageGoalProgress,
      activeReviews,
      completedReviews,
      pendingApprovals,
      totalGoals,
      completedGoals,
      activeGoals,
      totalAppraisals: appraisalsList.length,
      completedAppraisals: appraisalsList.filter((a: any) => a.status === 'completed').length,
      averageAppraisalRating: Number(averageRating.toFixed(1)),
      reviewsCompleted: completedReviews,
      generatedAt: new Date().toISOString(),
    };

    try {
      await this.analyticsRepo.upsertCache(ctx, 'dashboard_metrics', metrics, ctx.userId);
      await this.analyticsRepo.upsertCache(ctx, 'metrics', metrics, ctx.userId);
    } catch (e) {
      // Ignore cache write errors
    }

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
    if (metricType === 'metrics' || metricType === 'dashboard' || metricType === 'dashboard_metrics') {
      return this.generateDashboardMetrics(ctx);
    }

    try {
      const cache = await this.analyticsRepo.getByMetricType(ctx, metricType);
      if (!cache || this.analyticsRepo.isStale(cache.generated_at, 60)) {
        if (metricType === 'talent-matrix') {
          return this.generateTalentMatrix(ctx);
        }
        return this.generateDashboardMetrics(ctx);
      }
      return cache.metric_data;
    } catch (err) {
      return this.generateDashboardMetrics(ctx);
    }
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
