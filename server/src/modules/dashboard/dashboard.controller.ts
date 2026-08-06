import type { Request, Response } from 'express';
import { AdminDashboardService } from './dashboard.service';
import { asyncHandler } from '../../common/utils/asyncHandler';

export class AdminDashboardController {
  private service = new AdminDashboardService();

  getAdminStats = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx;
    if (!ctx) {
      res.status(401).json({ success: false, message: 'Tenant context required' });
      return;
    }

    const stats = await this.service.getAdminStats(ctx);
    res.status(200).json({
      success: true,
      data: stats,
    });
  });
}

export const adminDashboardController = new AdminDashboardController();
