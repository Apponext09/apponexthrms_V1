import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate';
import { GoalService } from '../services/GoalService';
import { goalCreateSchema, goalUpdateSchema } from '@apponexthrms/shared';

export class GoalController {
  private service: GoalService;

  constructor() {
    this.service = new GoalService();
  }

  createGoal = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, goalCreateSchema);

    const goal = await this.service.createGoal(ctx, {
      employeeId: validated.employeeId,
      goalTemplateId: validated.goalTemplateId,
      title: validated.title,
      description: validated.description,
      category: validated.category,
      startDate: validated.startDate,
      endDate: validated.endDate,
      targetValue: validated.targetValue,
      weight: validated.weight,
      status: validated.status,
    });

    res.status(201).json({ success: true, data: goal });
  });

  getGoal = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const goal = await this.service.getGoal(ctx, parseInt(id, 10));
    res.json({ success: true, data: goal });
  });

  listGoals = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 20, search, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    const result = await this.service.listGoals(ctx, {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as ('asc' | 'desc'),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  updateGoal = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const validated = validate(req.body, goalUpdateSchema);

    const goal = await this.service.updateGoal(ctx, parseInt(id, 10), validated as any);
    res.json({ success: true, data: goal });
  });

  updateProgress = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { progressValue, notes } = req.body;

    const goal = await this.service.updateProgress(ctx, parseInt(id, 10), progressValue, notes);
    res.json({ success: true, data: goal });
  });

  deleteGoal = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    await this.service.deleteGoal(ctx, parseInt(id, 10));
    res.json({ success: true });
  });

  getEmployeeGoals = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { employeeId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.service.getEmployeeGoals(ctx, parseInt(employeeId, 10), {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });
}

export const goalController = new GoalController();

