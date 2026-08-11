import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate';
import { JobReferenceService } from '../services/JobReferenceService';
import { jobReferenceApplySchema, jobReferenceReferExistingSchema } from '../types/mrf';

export class JobReferenceController {
  private jobRefService: JobReferenceService;

  constructor() {
    this.jobRefService = new JobReferenceService();
  }

  /**
   * GET /public/job-reference/:mrfId
   * Returns public-facing job reference data (no auth required)
   */
  getPublicJobData = asyncHandler(async (req: Request, res: Response) => {
    const { mrfId } = req.params;
    const parsedId = parseInt(mrfId, 10);
    if (isNaN(parsedId)) {
      res.status(400).json({ success: false, error: 'Invalid MRF ID' });
      return;
    }

    const data = await this.jobRefService.getPublicJobData(parsedId);

    if (!data) {
      res.status(404).json({ success: false, error: 'Job reference not found' });
      return;
    }

    if (data.status === 'Closed') {
      res.status(410).json({ success: false, error: 'This position has been closed' });
      return;
    }

    res.json({ success: true, data });
  });

  /**
   * POST /public/job-reference/:mrfId/apply
   * Submit a new candidate application from the public reference page
   */
  applyFromReference = asyncHandler(async (req: Request, res: Response) => {
    const { mrfId } = req.params;
    const parsedId = parseInt(mrfId, 10);
    if (isNaN(parsedId)) {
      res.status(400).json({ success: false, error: 'Invalid MRF ID' });
      return;
    }
    const validated = validate(req.body, jobReferenceApplySchema);

    // Determine organization from the MRF itself (public route — no auth ctx)
    const jobData = await this.jobRefService.getPublicJobData(parsedId);
    if (!jobData) {
      res.status(404).json({ success: false, error: 'Job reference not found' });
      return;
    }

    // Retrieve org ID from the raw mrf record
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();
    const mrf = await db('mrf_requests').where('id', parsedId).first();
    if (!mrf) {
      res.status(404).json({ success: false, error: 'MRF not found' });
      return;
    }

    const referringEmployeeId = req.body.referringEmployeeId
      ? parseInt(req.body.referringEmployeeId, 10)
      : undefined;

    const result = await this.jobRefService.applyFromReference(
      mrf.organization_id,
      parsedId,
      validated,
      referringEmployeeId
    );

    res.status(201).json({ success: true, data: result });
  });

  /**
   * POST /public/job-reference/:mrfId/refer-existing
   * Submit a referral for an existing candidate
   */
  referExisting = asyncHandler(async (req: Request, res: Response) => {
    const { mrfId } = req.params;
    const parsedId = parseInt(mrfId, 10);
    if (isNaN(parsedId)) {
      res.status(400).json({ success: false, error: 'Invalid MRF ID' });
      return;
    }
    const validated = validate(req.body, jobReferenceReferExistingSchema);

    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();
    const mrf = await db('mrf_requests').where('id', parsedId).first();
    if (!mrf) {
      res.status(404).json({ success: false, error: 'MRF not found' });
      return;
    }

    const referringEmployeeId = req.body.referringEmployeeId
      ? parseInt(req.body.referringEmployeeId, 10)
      : undefined;

    const result = await this.jobRefService.referExisting(
      mrf.organization_id,
      parsedId,
      validated.candidateId,
      referringEmployeeId
    );

    res.status(201).json({ success: true, data: result });
  });


  /**
   * GET /public/jobs
   * Returns list of active, externally published job postings (no auth required)
   */
  listPublicJobs = asyncHandler(async (req: Request, res: Response) => {
    const { organizationId, page = 1, pageSize = 20, search } = req.query;

    if (!organizationId) {
      res.status(400).json({ success: false, error: 'organizationId is required' });
      return;
    }

    const result = await this.jobRefService.listPublicJobs(parseInt(organizationId as string, 10), {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
      search: search as string,
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });
}

export const jobReferenceController = new JobReferenceController();
