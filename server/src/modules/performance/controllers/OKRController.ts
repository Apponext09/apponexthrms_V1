import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate';
import { OKRService } from '../services/OKRService';
import { okrCreateSchema, okrUpdateSchema, okrKeyResultCreateSchema } from '@apponexthrms/shared';

export class OKRController {
  private service: OKRService;

  constructor() {
    this.service = new OKRService();
  }

  createOKR = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, okrCreateSchema);

    const okr = await this.service.createOKR(ctx, {
      title: validated.title,
      description: validated.description,
      ownerId: validated.ownerId,
      startDate: validated.startDate,
      endDate: validated.endDate,
      alignedToGoalId: validated.alignedToGoalId,
    });

    res.status(201).json({ success: true, data: okr });
  });

  getOKR = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const okr = await this.service.getOKR(ctx, parseInt(id, 10));
    res.json({ success: true, data: okr });
  });

  updateOKR = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const validated = validate(req.body, okrUpdateSchema);

    const okr = await this.service.updateOKR(ctx, parseInt(id, 10), validated);
    res.json({ success: true, data: okr });
  });

  createKeyResult = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, okrKeyResultCreateSchema);

    const kr = await this.service.createKeyResult(ctx, {
      okrId: validated.okrId,
      description: validated.description,
      targetValue: validated.targetValue,
      weight: validated.weight,
    });

    res.status(201).json({ success: true, data: kr });
  });

  updateKeyResultProgress = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { keyResultId } = req.params;
    const { currentValue } = req.body;

    const kr = await this.service.updateKeyResultProgress(ctx, parseInt(keyResultId, 10), currentValue);
    res.json({ success: true, data: kr });
  });

  getCompletion = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const completion = await this.service.getOKRCompletion(ctx, parseInt(id, 10));
    res.json({ success: true, data: { completion } });
  });

  activateOKR = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const okr = await this.service.activateOKR(ctx, parseInt(id, 10));
    res.json({ success: true, data: okr });
  });

  completeOKR = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const okr = await this.service.completeOKR(ctx, parseInt(id, 10));
    res.json({ success: true, data: okr });
  });

  deleteOKR = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    await this.service.deleteOKR(ctx, parseInt(id, 10));
    res.json({ success: true });
  });
}

export const okrController = new OKRController();

