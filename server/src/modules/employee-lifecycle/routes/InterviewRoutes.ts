import { Router, Request, Response } from 'express';
import { authenticate } from '../../../common/middleware/authenticate';
import { resolveTenant } from '../../../common/middleware/resolveTenant';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { InterviewService } from '../services/InterviewService';

const router = Router();
const interviewService = new InterviewService();

router.use(authenticate, resolveTenant);

/**
 * POST /
 * Create new interview
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { organizationId, id: userId, oid } = req.user || {};
    const finalOrgId = organizationId || oid || 1;
    const finalUserId = userId || 1;

    const input = {
      ...req.body,
      organizationId: finalOrgId,
      createdBy: finalUserId,
    };

    const interview = await interviewService.createInterview(input);
    res.status(201).json({
      success: true,
      data: interview,
      message: 'Interview created successfully',
    });
  })
);

/**
 * GET /:id
 * Get interview details
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { organizationId } = req.user!;

    const interview = await interviewService.getInterviewById(Number(id), organizationId);
    res.json({
      success: true,
      data: interview,
    });
  })
);

/**
 * GET /
 * List interviews
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { organizationId } = req.user!;
    const { applicantId, limit = 50, offset = 0 } = req.query;

    let interviews;
    if (applicantId) {
      interviews = await interviewService.getInterviewsByApplicant(
        Number(applicantId),
        organizationId,
        Number(limit),
        Number(offset)
      );
    } else {
      interviews = await interviewService.listInterviews(
        organizationId,
        Number(limit),
        Number(offset)
      );
    }

    res.json({
      success: true,
      data: interviews,
    });
  })
);

/**
 * PUT /:id
 * Update interview
 */
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { organizationId, id: userId } = req.user!;

    const interview = await interviewService.updateInterview(
      Number(id),
      organizationId,
      req.body,
      userId
    );

    res.json({
      success: true,
      data: interview,
      message: 'Interview updated successfully',
    });
  })
);

/**
 * PATCH /:id/status
 * Update interview status
 */
router.patch(
  '/:id/status',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const { organizationId, id: userId } = req.user!;

    const interview = await interviewService.updateInterviewStatus(
      Number(id),
      organizationId,
      status,
      userId
    );

    res.json({
      success: true,
      data: interview,
      message: 'Interview status updated successfully',
    });
  })
);

/**
 * POST /:id/feedback
 * Submit interview feedback
 */
router.post(
  '/:id/feedback',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { feedback, rating } = req.body;
    const { organizationId, id: userId } = req.user!;

    const interview = await interviewService.submitFeedback(
      Number(id),
      organizationId,
      { feedback, rating },
      userId
    );

    res.json({
      success: true,
      data: interview,
      message: 'Feedback submitted successfully',
    });
  })
);

/**
 * DELETE /:id
 * Delete interview
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { organizationId, id: userId } = req.user!;

    await interviewService.deleteInterview(Number(id), organizationId, userId);

    res.json({
      success: true,
      message: 'Interview deleted successfully',
    });
  })
);

/**
 * GET /schedule/:interviewerId
 * Get interviewer's schedule
 */
router.get(
  '/schedule/:interviewerId',
  asyncHandler(async (req: Request, res: Response) => {
    const { interviewerId } = req.params;
    const { organizationId } = req.user!;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate query parameters are required',
      });
    }

    const schedule = await interviewService.getInterviewerSchedule(
      Number(interviewerId),
      organizationId,
      new Date(String(startDate)),
      new Date(String(endDate))
    );

    res.json({
      success: true,
      data: schedule,
    });
  })
);

export const interviewRouter = router;
