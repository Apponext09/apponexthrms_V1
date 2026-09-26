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
   * Supports both numeric ID and mr_number (e.g., "MR-4")
   */
  getPublicJobData = asyncHandler(async (req: Request, res: Response) => {
    const { mrfId } = req.params;
    const parsedId = parseInt(mrfId, 10);

    let data;
    if (!isNaN(parsedId) && String(parsedId) === mrfId) {
      // Numeric ID lookup
      data = await this.jobRefService.getPublicJobData(parsedId);
    } else {
      // mr_number string lookup (e.g., "MR-4")
      data = await this.jobRefService.getPublicJobDataByMrNumber(mrfId);
    }

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
   * Helper to resolve MRF or Job record using any identifier:
   * numeric ID, mr_number (e.g. "MR-4", "4"), job_code (e.g. "SE-01", "QA-01"), or UUID.
   */
  private async resolveTargetJobOrMrf(mrfId: string | number) {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();
    const idStr = String(mrfId || '').trim();
    const idNum = !isNaN(Number(idStr)) ? Number(idStr) : null;

    // 1. Try finding in mrf_requests
    try {
      let mrfQuery = db('mrf_requests').whereNull('deleted_at');
      if (idNum !== null) {
        mrfQuery = mrfQuery.where((q) => {
          q.where('id', idNum)
           .orWhere('mr_number', idStr)
           .orWhere('mr_number', `MR-${idStr}`)
           .orWhere('mr_number', `MR-0${idStr}`)
           .orWhere('mr_number', `MR-00${idStr}`);
        });
      } else {
        mrfQuery = mrfQuery.where((q) => {
          q.where('mr_number', idStr)
           .orWhere('mr_number', 'like', `%${idStr}%`)
           .orWhere('uuid', idStr);
        });
      }
      const mrf = await mrfQuery.first();
      if (mrf) {
        return {
          id: mrf.id,
          organizationId: mrf.organizationId || mrf.organization_id || 1,
          mrf,
        };
      }
    } catch (e) {
      console.warn('mrf_requests resolution warning:', e);
    }

    // 2. Try finding in jobs table (from Job Management / Job Openings)
    try {
      let jobQuery = db('jobs').whereNull('deleted_at');
      if (idNum !== null) {
        jobQuery = jobQuery.where((q) => {
          q.where('id', idNum)
           .orWhere('job_code', idStr)
           .orWhere('mrf_request_id', idNum);
        });
      } else {
        jobQuery = jobQuery.where((q) => {
          q.where('job_code', idStr)
           .orWhere('job_code', 'like', `%${idStr}%`)
           .orWhere('uuid', idStr);
        });
      }
      const job = await jobQuery.first();
      if (job) {
        return {
          id: (job as any).mrf_request_id || (job as any).mrfRequestId || job.id,
          organizationId: (job as any).organization_id || (job as any).organizationId || 1,
          job,
        };
      }
    } catch (e) {
      console.warn('jobs resolution warning:', e);
    }

    // 3. Fallback: Check without whereNull('deleted_at') if table doesn't have deleted_at
    if (idNum !== null) {
      try {
        const mrf = await db('mrf_requests').where('id', idNum).first();
        if (mrf) {
          return {
            id: mrf.id,
            organizationId: mrf.organizationId || mrf.organization_id || 1,
            mrf,
          };
        }
      } catch {}
      try {
        const job = await db('jobs').where('id', idNum).first();
        if (job) {
          return {
            id: (job as any).mrf_request_id || job.id,
            organizationId: (job as any).organization_id || (job as any).organizationId || 1,
            job,
          };
        }
      } catch {}
    }

    // 4. Default fallback to first active MRF or Job if available
    try {
      const anyJob = await db('jobs').whereNull('deleted_at').first();
      if (anyJob) {
        return {
          id: (anyJob as any).mrf_request_id || anyJob.id,
          organizationId: (anyJob as any).organization_id || (anyJob as any).organizationId || 1,
          job: anyJob,
        };
      }
      const anyMrf = await db('mrf_requests').whereNull('deleted_at').first();
      if (anyMrf) {
        return {
          id: anyMrf.id,
          organizationId: anyMrf.organizationId || anyMrf.organization_id || 1,
          mrf: anyMrf,
        };
      }
    } catch {}

    return null;
  }

  /**
   * POST /public/job-reference/:mrfId/apply
   * Submit a new candidate application from the public reference page
   */
  applyFromReference = asyncHandler(async (req: Request, res: Response) => {
    const { mrfId } = req.params;

    const resolved = await this.resolveTargetJobOrMrf(mrfId);

    if (!resolved) {
      res.status(404).json({ success: false, error: 'MRF or Job opening not found' });
      return;
    }

    const validated = validate(req.body, jobReferenceApplySchema);

    const referringEmployeeId = req.body.referringEmployeeId
      ? parseInt(req.body.referringEmployeeId, 10)
      : undefined;

    const effectiveOrgId = req.body.organizationId
      ? parseInt(req.body.organizationId, 10)
      : (req.query.organizationId ? parseInt(req.query.organizationId as string, 10) : (resolved.organizationId || 1));

    const result = await this.jobRefService.applyFromReference(
      effectiveOrgId,
      resolved.id,
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

    const resolved = await this.resolveTargetJobOrMrf(mrfId);

    if (!resolved) {
      res.status(404).json({ success: false, error: 'MRF or Job opening not found' });
      return;
    }

    const validated = validate(req.body, jobReferenceReferExistingSchema);

    const referringEmployeeId = req.body.referringEmployeeId
      ? parseInt(req.body.referringEmployeeId, 10)
      : undefined;

    const effectiveOrgId = req.body.organizationId
      ? parseInt(req.body.organizationId, 10)
      : (req.query.organizationId ? parseInt(req.query.organizationId as string, 10) : (resolved.organizationId || 1));

    const result = await this.jobRefService.referExisting(
      effectiveOrgId,
      resolved.id,
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

  /**
   * GET /public/job-portal/filters
   * Returns departments, designations, employment types for filter dropdowns
   */
  getFilterData = asyncHandler(async (req: Request, res: Response) => {
    const { organizationId } = req.query;
    const orgId = organizationId ? parseInt(organizationId as string, 10) : undefined;

    const data = await this.jobRefService.getFilterData(orgId);
    res.json({ success: true, data });
  });

  /**
   * GET /public/job-portal/openings
   * Returns active MRF openings with filtering
   */
  listOpenings = asyncHandler(async (req: Request, res: Response) => {
    const { organizationId, departmentId, departmentName, employmentType, search, page, pageSize } = req.query;
    const reqOrg = (req as any).user?.organizationId || (req as any).ctx?.organizationId || req.headers['x-organization-id'] || req.headers['x-company-id'];
    const orgId = organizationId ? parseInt(organizationId as string, 10) : (reqOrg ? parseInt(String(reqOrg), 10) : undefined);

    const result = await this.jobRefService.listOpenings(
      orgId,
      {
        departmentId: departmentId ? parseInt(departmentId as string, 10) : undefined,
        departmentName: departmentName as string || undefined,
        employmentType: employmentType as string || undefined,
        search: search as string || undefined,
        page: page ? parseInt(page as string, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : 100,
      }
    );

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  /**
   * GET /public/job-portal/candidates
   * Returns list of candidates with uploaded resumes for referral selection
   */
  listCandidatesWithResumes = asyncHandler(async (req: Request, res: Response) => {
    const { organizationId } = req.query;
    const orgId = organizationId ? parseInt(organizationId as string, 10) : undefined;

    const data = await this.jobRefService.getCandidatesWithResumes(orgId);
    res.json({ success: true, data });
  });

  /**
   * GET /public/job-portal/settings
   * Public endpoint to fetch Career Portal customization settings
   */
  getPublicPortalSettings = asyncHandler(async (req: Request, res: Response) => {
    const { CareerPortalSettingsService } = await import('../services/CareerPortalSettingsService');
    const settingsService = new CareerPortalSettingsService();
    const orgId = req.query.organizationId ? parseInt(req.query.organizationId as string, 10) : 1;
    const settings = await settingsService.getSettings(orgId);
    res.json({ success: true, data: settings });
  });

  /**
   * GET /recruitment/career-portal-settings
   * Authenticated HR/Admin endpoint to fetch Career Portal settings
   */
  getPortalSettings = asyncHandler(async (req: Request, res: Response) => {
    const { CareerPortalSettingsService } = await import('../services/CareerPortalSettingsService');
    const settingsService = new CareerPortalSettingsService();
    const user = (req as any).user;
    console.log('[GET career-portal-settings] user.organizationId:', user?.organizationId);
    const settings = await settingsService.getSettings();
    console.log('[GET career-portal-settings] returned portalTitle:', settings.portalTitle);
    console.log('[GET career-portal-settings] returned companyLogoUrl length:', settings.companyLogoUrl?.length);
    res.json({ success: true, data: settings });
  });

  /**
   * PUT /recruitment/career-portal-settings
   * Authenticated HR/Admin endpoint to update Career Portal settings
   */
  updatePortalSettings = asyncHandler(async (req: Request, res: Response) => {
    const { CareerPortalSettingsService } = await import('../services/CareerPortalSettingsService');
    const settingsService = new CareerPortalSettingsService();
    const user = (req as any).user;
    console.log('[PUT career-portal-settings] user.organizationId:', user?.organizationId);
    console.log('[PUT career-portal-settings] payload.portalTitle:', req.body.portalTitle);
    console.log('[PUT career-portal-settings] payload.companyLogoUrl length:', req.body.companyLogoUrl?.length);
    console.log('[PUT career-portal-settings] payload.primaryColor:', req.body.primaryColor);
    console.log('[PUT career-portal-settings] typeof payload.formFieldsConfig:', typeof req.body.formFieldsConfig);
    const updated = await settingsService.updateSettings(1, req.body);
    console.log('[PUT career-portal-settings] AFTER updateSettings, portalTitle:', updated.portalTitle);
    console.log('[PUT career-portal-settings] AFTER updateSettings, companyLogoUrl length:', updated.companyLogoUrl?.length);
    res.json({ success: true, data: updated, message: 'Career Portal settings saved successfully!' });
  });
}

export const jobReferenceController = new JobReferenceController();

