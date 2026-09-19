import { Request, Response } from 'express';
import { approvalService } from '../services/ApprovalService';
import { asyncHandler } from '../../../common/utils/asyncHandler';

export class ApprovalController {
  getDashboardData = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const companyId = ctx.companyId ? Number(ctx.companyId) : undefined;
    const data = await approvalService.getDashboardData(ctx.organizationId, {
      companyId,
    });
    
    res.json({
      success: true,
      data
    });
  });
}

export const approvalController = new ApprovalController();
