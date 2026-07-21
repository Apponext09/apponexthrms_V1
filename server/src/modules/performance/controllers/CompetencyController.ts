import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate';
import { CompetencyService } from '../services/CompetencyService';
import {
  competencyFrameworkCreateSchema,
  competencyCreateSchema,
  employeeCompetencyCreateSchema,
} from '@apponexthrms/shared';

export class CompetencyController {
  private service: CompetencyService;

  constructor() {
    this.service = new CompetencyService();
  }

  createFramework = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, competencyFrameworkCreateSchema);

    const framework = await this.service.createFramework(ctx, {
      name: validated.name,
      description: validated.description,
    });

    res.status(201).json({ success: true, data: framework });
  });

  createCompetency = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, competencyCreateSchema);

    const competency = await this.service.createCompetency(ctx, {
      frameworkId: validated.frameworkId,
      name: validated.name,
      description: validated.description,
      proficiencyLevels: validated.proficiencyLevels,
    });

    res.status(201).json({ success: true, data: competency });
  });

  assessCompetency = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, employeeCompetencyCreateSchema);

    const assessment = await this.service.assessCompetency(ctx, {
      employeeId: validated.employeeId,
      competencyId: validated.competencyId,
      currentLevel: validated.currentLevel || 0,
      targetLevel: validated.targetLevel,
    });

    res.status(201).json({ success: true, data: assessment });
  });

  getEmployeeCompetencies = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { employeeId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.service.getEmployeeCompetencies(ctx, parseInt(employeeId, 10), {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getCompetencyGaps = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { employeeId } = req.params;

    const gaps = await this.service.getCompetencyGaps(ctx, parseInt(employeeId, 10));
    res.json({ success: true, data: gaps });
  });

  getFrameworkWithCompetencies = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { frameworkId } = req.params;

    const framework = await this.service.getFrameworkWithCompetencies(ctx, parseInt(frameworkId, 10));
    res.json({ success: true, data: framework });
  });

  listFrameworks = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.service.listFrameworks(ctx, {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  updateCompetency = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const updates = req.body;

    const competency = await this.service.updateCompetency(ctx, parseInt(id, 10), updates);
    res.json({ success: true, data: competency });
  });
}

export const competencyController = new CompetencyController();

