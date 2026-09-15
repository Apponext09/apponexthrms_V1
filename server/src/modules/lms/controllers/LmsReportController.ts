import type { Request, Response } from 'express';
import { lmsReportService } from '../services/LmsReportService';

export class LmsReportController {
  async getDashboardAnalytics(req: Request, res: Response) {
    const analytics = await lmsReportService.getDashboardAnalytics(req.ctx!);
    res.json({ success: true, data: analytics });
  }
}

export const lmsReportController = new LmsReportController();
