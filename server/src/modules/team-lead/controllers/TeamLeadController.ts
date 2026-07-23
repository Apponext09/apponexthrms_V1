import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { TeamLeadService } from '../services/TeamLeadService';

export class TeamLeadController {
  private service = new TeamLeadService();

  /**
   * Get team dashboard metrics
   */
  getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const data = await this.service.getTeamDashboard(ctx);
    res.json({ success: true, data });
  });

  /**
   * List team members (direct reports)
   */
  getTeamMembers = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const data = await this.service.getTeamMembers(ctx);
    res.json({ success: true, data });
  });

  /**
   * Get pending approvals
   */
  getApprovals = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const data = await this.service.getPendingApprovals(ctx);
    res.json({ success: true, data });
  });

  /**
   * Decide approval action
   */
  decideApproval = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { status, comment } = req.body;

    if (status !== 'approved' && status !== 'rejected') {
      res.status(400).json({ success: false, message: 'Invalid status action. Must be approved or rejected.' });
      return;
    }

    const result = await this.service.decideApproval(ctx, parseInt(id, 10), status, comment);
    res.json(result);
  });
}
