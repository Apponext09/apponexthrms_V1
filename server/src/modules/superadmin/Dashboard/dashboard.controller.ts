import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { superAdminService } from '../superadmin.service';

export class SuperAdminDashboardController {
  /**
   * Get SuperAdmin platform analytics and stats
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await superAdminService.getDashboardStats();
    res.json({
      success: true,
      data: stats,
    });
  });
}

export const superAdminDashboardController = new SuperAdminDashboardController();
