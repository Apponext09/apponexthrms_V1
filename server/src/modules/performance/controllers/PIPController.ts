import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate';
import { PIPService } from '../services/PIPService';
import { pipCreateSchema } from '@apponexthrms/shared';

export class PIPController {
  private service: PIPService;

  constructor() {
    this.service = new PIPService();
  }

  createPIP = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, pipCreateSchema);

    const pip = await this.service.createPIP(ctx, {
      employeeId: validated.employeeId,
      startDate: validated.startDate,
      endDate: validated.endDate,
      reason: validated.reason,
    });

    res.status(201).json({ success: true, data: pip });
  });

  addGoal = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { pipId } = req.params;
    const { goalDescription, targetDate } = req.body;

    const goal = await this.service.addGoal(ctx, {
      pipId: parseInt(pipId, 10),
      goalDescription,
      targetDate,
    });

    res.status(201).json({ success: true, data: goal });
  });

  createReview = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { pipId } = req.params;
    const { reviewDate, status, notes } = req.body;

    const review = await this.service.createReview(ctx, {
      pipId: parseInt(pipId, 10),
      reviewDate,
      status,
      notes,
    });

    res.status(201).json({ success: true, data: review });
  });

  getPIP = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const pip = await this.service.getPIP(ctx, parseInt(id, 10));
    res.json({ success: true, data: pip });
  });

  getPIPWithDetails = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const pip = await this.service.getPIPWithDetails(ctx, parseInt(id, 10));
    res.json({ success: true, data: pip });
  });

  getEmployeePIPs = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { employeeId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.service.getEmployeePIPs(ctx, parseInt(employeeId, 10), {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getPIPProgress = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const progress = await this.service.getPIPProgress(ctx, parseInt(id, 10));
    res.json({ success: true, data: progress });
  });

  updateGoalStatus = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { goalId } = req.params;
    const { status } = req.body;

    const goal = await this.service.updateGoalStatus(ctx, parseInt(goalId, 10), status);
    res.json({ success: true, data: goal });
  });

  completePIP = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const pip = await this.service.completePIP(ctx, parseInt(id, 10));
    res.json({ success: true, data: pip });
  });
}

export const pipController = new PIPController();

