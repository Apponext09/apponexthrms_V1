import { Request, Response } from 'express';
import { approvalService } from '../services/ApprovalService';
import { asyncHandler } from '../../../common/utils/asyncHandler';

export class ApprovalController {
  getDashboardData = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    // Note: Assuming ctx.organizationId is set by middleware
    const data = await approvalService.getDashboardData(ctx.organizationId);
    
    res.json({
      success: true,
      data
    });
  });
}

export const approvalController = new ApprovalController();
