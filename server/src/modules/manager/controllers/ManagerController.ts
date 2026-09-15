import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { ManagerService } from '../services/ManagerService';

export class ManagerController {
  private service = new ManagerService();

  /**
   * Get department dashboard metrics
   */
  getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const data = await this.service.getDepartmentDashboard(ctx);
    res.json({ success: true, data });
  });

  /**
   * List department employees
   */
  getEmployees = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const data = await this.service.getDepartmentEmployees(ctx);
    res.json({ success: true, data });
  });

  /**
   * Submit promotion/transfer recommendation
   */
  submitRecommendation = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { employeeId, type, details } = req.body;

    if (!employeeId || !type || !details) {
      res.status(400).json({ success: false, message: 'employeeId, type, and details are required.' });
      return;
    }

    const result = await this.service.submitRecommendation(ctx, parseInt(employeeId, 10), type, details);
    res.json(result);
  });

  /** HR verification inbox for manager-submitted employment changes. */
  getHrRecommendationQueue = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.service.getHrRecommendationQueue(req.ctx!);
    res.json({ success: true, data });
  });

  /** HR may approve (verify) or reject a proposal; employee master data is
   * intentionally left untouched until the final employment-change process. */
  decideHrRecommendation = asyncHandler(async (req: Request, res: Response) => {
    const status = req.body?.status;
    if (!['approved', 'rejected'].includes(status)) {
      res.status(400).json({ success: false, message: 'status must be approved or rejected.' });
      return;
    }
    const result = await this.service.decideHrRecommendation(req.ctx!, Number(req.params.id), status, req.body?.comment);
    res.json(result);
  });

  /**
   * Submit hiring request
   */
  submitResourceRequest = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { designationId, justification } = req.body;

    if (!designationId || !justification) {
      res.status(400).json({ success: false, message: 'designationId and justification are required.' });
      return;
    }

    const result = await this.service.submitResourceRequest(ctx, parseInt(designationId, 10), justification);
    res.json(result);
  });
}
