import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate';
import { ReviewService } from '../services/ReviewService';
import {
  reviewCycleCreateSchema,
  reviewTemplateCreateSchema,
  performanceReviewCreateSchema,
} from '@apponexthrms/shared';

export class ReviewController {
  private service: ReviewService;

  constructor() {
    this.service = new ReviewService();
  }

  createCycle = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, reviewCycleCreateSchema);

    const cycle = await this.service.createCycle(ctx, {
      name: validated.name,
      cycleType: validated.cycleType,
      startDate: validated.startDate,
      endDate: validated.endDate,
    });

    res.status(201).json({ success: true, data: cycle });
  });

  createTemplate = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, reviewTemplateCreateSchema);

    const template = await this.service.createTemplate(ctx, {
      cycleId: validated.cycleId,
      name: validated.name,
      sections: validated.sections,
      maxScore: validated.maxScore,
    });

    res.status(201).json({ success: true, data: template });
  });

  createReview = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, performanceReviewCreateSchema);

    const review = await this.service.createReview(ctx, {
      employeeId: validated.employeeId,
      reviewerId: validated.reviewerId,
      cycleId: validated.cycleId,
      templateId: validated.templateId,
    });

    res.status(201).json({ success: true, data: review });
  });

  getReview = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const review = await this.service.getReview(ctx, parseInt(id, 10));
    res.json({ success: true, data: review });
  });

  submitReview = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { overallRating } = req.body;

    const review = await this.service.submitReview(ctx, parseInt(id, 10), overallRating);
    res.json({ success: true, data: review });
  });

  approveReview = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const review = await this.service.approveReview(ctx, parseInt(id, 10));
    res.json({ success: true, data: review });
  });

  getEmployeeReviews = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { employeeId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.service.getEmployeeReviews(ctx, parseInt(employeeId, 10), {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getCycleReviews = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { cycleId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.service.getCycleReviews(ctx, parseInt(cycleId, 10), {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  activateCycle = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const cycle = await this.service.activateCycle(ctx, parseInt(id, 10));
    res.json({ success: true, data: cycle });
  });

  completeCycle = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const cycle = await this.service.completeCycle(ctx, parseInt(id, 10));
    res.json({ success: true, data: cycle });
  });
}

export const reviewController = new ReviewController();

