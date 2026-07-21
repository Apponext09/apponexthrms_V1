import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate';
import { RecognitionService } from '../services/RecognitionService';
import { recognitionCreateSchema } from '@apponexthrms/shared';

export class RecognitionController {
  private service: RecognitionService;

  constructor() {
    this.service = new RecognitionService();
  }

  recognize = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, recognitionCreateSchema);

    const recognition = await this.service.recognize(ctx, {
      recognizedBy: validated.recognizedBy,
      employeeId: validated.employeeId,
      recognitionType: validated.recognitionType,
      pointsAwarded: validated.pointsAwarded,
      message: validated.message,
    });

    res.status(201).json({ success: true, data: recognition });
  });

  getEmployeeRecognitions = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { employeeId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.service.getEmployeeRecognitions(ctx, parseInt(employeeId, 10), {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getTotalPoints = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { employeeId } = req.params;

    const total = await this.service.getTotalPoints(ctx, parseInt(employeeId, 10));
    res.json({ success: true, data: { totalPoints: total } });
  });

  getRewardPoints = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { employeeId } = req.params;

    const points = await this.service.getRewardPoints(ctx, parseInt(employeeId, 10));
    res.json({ success: true, data: points });
  });

  redeemPoints = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { employeeId } = req.params;
    const { pointsToRedeem } = req.body;

    const updated = await this.service.redeemPoints(ctx, parseInt(employeeId, 10), pointsToRedeem);
    res.json({ success: true, data: updated });
  });

  getRecognitionsByType = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { type } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.service.getRecognitionsByType(ctx, type, {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getLeaderboard = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { limit = 10 } = req.query;

    const leaderboard = await this.service.getLeaderboard(ctx, parseInt(limit as string, 10));
    res.json({ success: true, data: leaderboard });
  });
}

export const recognitionController = new RecognitionController();

