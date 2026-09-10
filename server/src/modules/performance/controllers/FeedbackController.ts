import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate';
import { FeedbackService } from '../services/FeedbackService';
import { feedbackRequestCreateSchema, feedbackResponseCreateSchema } from '@apponexthrms/shared';

export class FeedbackController {
  private service: FeedbackService;

  constructor() {
    this.service = new FeedbackService();
  }

  createFeedbackRequest = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, feedbackRequestCreateSchema);

    const request = await this.service.createFeedbackRequest(ctx, {
      employeeId: validated.employeeId,
      reviewerId: validated.reviewerId,
      cycleId: validated.cycleId,
      feedbackType: validated.feedbackType,
      deadline: validated.deadline,
    });

    res.status(201).json({ success: true, data: request });
  });

  submitFeedback = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, feedbackResponseCreateSchema);

    const response = await this.service.submitFeedback(ctx, {
      feedbackRequestId: validated.feedbackRequestId,
      responseText: validated.responseText,
      score: validated.score,
      isAnonymous: validated.isAnonymous,
    });

    res.status(201).json({ success: true, data: response });
  });

  getEmployeeFeedbackRequests = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { employeeId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.service.getEmployeeFeedbackRequests(ctx, parseInt(employeeId, 10), {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getPendingRequests = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.service.getPendingRequests(ctx, {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getResponses = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { requestId } = req.params;

    const responses = await this.service.getResponses(ctx, parseInt(requestId, 10));
    res.json({ success: true, data: responses.items });
  });

  get360Feedback = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { employeeId, cycleId } = req.params;

    const feedback = await this.service.get360Feedback(ctx, parseInt(employeeId, 10), parseInt(cycleId, 10));
    res.json({ success: true, data: feedback });
  });

  getAverageScore = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { requestId } = req.params;

    const score = await this.service.getAverageFeedbackScore(ctx, parseInt(requestId, 10));
    res.json({ success: true, data: { averageScore: score } });
  });
}

export const feedbackController = new FeedbackController();

