import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate';
import { AppraisalService } from '../services/AppraisalService';
import { appraisalCreateSchema } from '@apponexthrms/shared';

export class AppraisalController {
  private service: AppraisalService;

  constructor() {
    this.service = new AppraisalService();
  }

  createAppraisal = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, appraisalCreateSchema);

    const appraisal = await this.service.createAppraisal(ctx, {
      employeeId: validated.employeeId,
      cycleId: validated.cycleId,
    });

    res.status(201).json({ success: true, data: appraisal });
  });

  addCompetencyRating = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { appraisalId } = req.params;
    const { competencyId, rating } = req.body;

    const competencyRating = await this.service.addCompetencyRating(ctx, {
      appraisalId: parseInt(appraisalId, 10),
      competencyId,
      rating,
    });

    res.status(201).json({ success: true, data: competencyRating });
  });

  getAppraisal = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const appraisal = await this.service.getAppraisal(ctx, parseInt(id, 10));
    res.json({ success: true, data: appraisal });
  });

  getAppraisalWithRatings = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const appraisal = await this.service.getAppraisalWithRatings(ctx, parseInt(id, 10));
    res.json({ success: true, data: appraisal });
  });

  finalizeAppraisal = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const appraisal = await this.service.finalizeAppraisal(ctx, parseInt(id, 10));
    res.json({ success: true, data: appraisal });
  });

  getEmployeeAppraisals = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { employeeId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.service.getEmployeeAppraisals(ctx, parseInt(employeeId, 10), {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getCycleAppraisals = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { cycleId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.service.getCycleAppraisals(ctx, parseInt(cycleId, 10), {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getOrganizationAverageRating = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { cycleId } = req.params;

    const avgRating = await this.service.calculateOrganizationAverageRating(ctx, parseInt(cycleId, 10));
    res.json({ success: true, data: { averageRating: avgRating } });
  });
}

export const appraisalController = new AppraisalController();

