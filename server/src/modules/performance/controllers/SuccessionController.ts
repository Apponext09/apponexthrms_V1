import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate';
import { SuccessionService } from '../services/SuccessionService';
import { successionPositionCreateSchema, successorCreateSchema } from '@apponexthrms/shared';

export class SuccessionController {
  private service: SuccessionService;

  constructor() {
    this.service = new SuccessionService();
  }

  createPosition = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, successionPositionCreateSchema);

    const position = await this.service.createPosition(ctx, {
      positionTitle: validated.positionTitle,
      critical: validated.critical,
      numSuccessors: validated.numSuccessors,
    });

    res.status(201).json({ success: true, data: position });
  });

  addSuccessor = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, successorCreateSchema);

    const successor = await this.service.addSuccessor(ctx, {
      positionId: validated.positionId,
      employeeId: validated.employeeId,
      readinessLevel: validated.readinessLevel,
    });

    res.status(201).json({ success: true, data: successor });
  });

  getPosition = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const position = await this.service.getPosition(ctx, parseInt(id, 10));
    res.json({ success: true, data: position });
  });

  getPositionWithSuccessors = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const position = await this.service.getPositionWithSuccessors(ctx, parseInt(id, 10));
    res.json({ success: true, data: position });
  });

  getReadySuccessors = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { positionId } = req.params;

    const successors = await this.service.getReadySuccessors(ctx, parseInt(positionId, 10));
    res.json({ success: true, data: successors });
  });

  getHighPotentialSuccessors = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { positionId } = req.params;

    const successors = await this.service.getHighPotentialSuccessors(ctx, parseInt(positionId, 10));
    res.json({ success: true, data: successors });
  });

  getCriticalPositions = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.service.getCriticalPositions(ctx, {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getPositionsForEmployee = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { employeeId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.service.getPositionsForEmployee(ctx, parseInt(employeeId, 10), {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  updateSuccessorReadiness = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { successorId } = req.params;
    const { readinessLevel } = req.body;

    const successor = await this.service.updateSuccessorReadiness(ctx, parseInt(successorId, 10), readinessLevel);
    res.json({ success: true, data: successor });
  });

  getAllPositions = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.service.getAllPositions(ctx, {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });
}

export const successionController = new SuccessionController();

