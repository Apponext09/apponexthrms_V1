import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { AnalyticsService } from '../services/AnalyticsService';

export class AnalyticsController {
  private service: AnalyticsService;

  constructor() {
    this.service = new AnalyticsService();
  }

  getDashboardMetrics = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const metrics = await this.service.generateDashboardMetrics(ctx);
    res.json({ success: true, data: metrics });
  });

  getMetrics = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const metrics = await this.service.generateDashboardMetrics(ctx);
    res.json({ success: true, data: metrics });
  });

  getGoalProgressReport = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { employeeId } = req.query;

    const report = await this.service.generateGoalProgressReport(
      ctx,
      employeeId ? parseInt(employeeId as string, 10) : undefined
    );
    res.json({ success: true, data: report });
  });

  getTalentMatrix = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const matrix = await this.service.generateTalentMatrix(ctx);
    res.json({ success: true, data: matrix });
  });

  getReviewCycleReport = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { cycleId } = req.params;

    const report = await this.service.generateReviewCycleReport(ctx, parseInt(cycleId, 10));
    res.json({ success: true, data: report });
  });

  getMetric = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { metricType } = req.params;

    const metric = await this.service.getMetric(ctx, metricType);
    if (!metric) {
      return res.status(404).json({ success: false, message: 'Metric not found or stale' });
    }

    res.json({ success: true, data: metric });
  });
}

export const analyticsController = new AnalyticsController();

