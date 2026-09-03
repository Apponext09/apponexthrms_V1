import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate';
import { ResumeBankService } from '../services/ResumeBankService';
import { ATSService } from '../services/ATSService';
import { createResumeBankEntrySchema, shortlistResumeSchema } from '../types/mrf';

export class ResumeBankController {
  private resumeBankService: ResumeBankService;
  private atsService: ATSService;

  constructor() {
    this.resumeBankService = new ResumeBankService();
    this.atsService = new ATSService();
  }

  addEntry = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, createResumeBankEntrySchema);

    const entry = await this.resumeBankService.addEntry(ctx, validated);

    res.status(201).json({ success: true, data: entry });
  });

  shortlistToPipeline = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const validated = validate(req.body, shortlistResumeSchema);

    const application = await this.resumeBankService.shortlistToPipeline(
      ctx,
      parseInt(id, 10),
      validated
    );

    res.status(201).json({ success: true, data: application, message: 'Candidate shortlisted and moved to pipeline successfully' });
  });

  listEntries = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const {
      page = 1,
      pageSize = 50,
      trackerId,
      search,
      source,
      position,
      status,
      mrfRequestId,
      mrf_request_id,
      qualification,
      skills,
    } = req.query;

    const filters: Record<string, unknown> = {};
    if (mrfRequestId || mrf_request_id) filters.mrf_request_id = mrfRequestId || mrf_request_id;
    if (source) filters.source = source;
    if (position) filters.position = position;
    if (status) filters.status = status;
    if (qualification) filters.qualification = qualification;
    if (skills) filters.skills = skills;

    const result = await this.resumeBankService.listEntries(ctx, {
      page: parseInt(page as string, 10) || 1,
      pageSize: parseInt(pageSize as string, 10) || 50,
      search: search as string,
      trackerId: trackerId as string,
      source: source as string,
      position: position as string,
      status: status as string,
      filters,
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  runAtsScoring = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { jobId, manualSkills, topN = 10, sourceFilter, minMatchPct = 0, useAI = false } = req.body;

    if (!jobId) {
      res.status(400).json({ success: false, error: 'jobId is required to run ATS scoring' });
      return;
    }

    let parsedManualSkills: string[] = [];
    if (Array.isArray(manualSkills)) {
      parsedManualSkills = manualSkills;
    } else if (typeof manualSkills === 'string') {
      parsedManualSkills = manualSkills.split(',').map(s => s.trim()).filter(Boolean);
    }

    const atsResults = await this.atsService.scoreResumesForJob(ctx, Number(jobId), {
      manualSkills: parsedManualSkills,
      topN: Number(topN) || 10,
      sourceFilter: sourceFilter as string,
      minMatchPct: Number(minMatchPct) || 0,
      useAI: Boolean(useAI),
    });

    res.json({
      success: true,
      data: atsResults.results,
      meta: {
        totalScanned: atsResults.totalScanned,
        topN: Number(topN) || 10,
        jobDetails: atsResults.jobDetails,
      },
    });
  });

  bulkUploadFiles = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const reqFiles = (req as any).files || [];
    const singleFile = (req as any).file;
    const { jobId, source } = req.body;

    const filesToProcess: Array<{ buffer: Buffer; originalname: string }> = [];
    const fs = await import('fs');

    const extractBuffer = (f: any): Buffer | null => {
      if (f.buffer && Buffer.isBuffer(f.buffer)) return f.buffer;
      if (f.path && fs.existsSync(f.path)) {
        const b = fs.readFileSync(f.path);
        try { fs.unlinkSync(f.path); } catch (e) {}
        return b;
      }
      return null;
    };

    if (Array.isArray(reqFiles) && reqFiles.length > 0) {
      for (const f of reqFiles) {
        const buf = extractBuffer(f);
        if (buf) {
          filesToProcess.push({
            buffer: buf,
            originalname: f.originalname,
          });
        }
      }
    } else if (singleFile) {
      const buf = extractBuffer(singleFile);
      if (buf) {
        filesToProcess.push({
          buffer: buf,
          originalname: singleFile.originalname,
        });
      }
    }

    if (filesToProcess.length === 0) {
      res.status(400).json({ success: false, error: 'No valid files received for upload' });
      return;
    }

    const result = await this.resumeBankService.bulkUploadResumes(ctx, filesToProcess, {
      jobId: jobId ? Number(jobId) : undefined,
      source: (source as string) || 'bulk_import',
    });

    res.status(202).json({
      success: true,
      data: result,
      message: `Bulk upload completed. Success: ${result.successCount}, Failed: ${result.failedCount}`,
    });
  });

  bulkUpload = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    
    // Gather all uploaded files
    let uploadedFiles: any[] = [];
    if ((req as any).files && Array.isArray((req as any).files)) {
      uploadedFiles = (req as any).files;
    } else if ((req as any).files && typeof (req as any).files === 'object') {
      uploadedFiles = Object.values((req as any).files).flat();
    } else if ((req as any).file) {
      uploadedFiles = [(req as any).file];
    }

    if (uploadedFiles.length === 0) {
      res.status(400).json({ success: false, error: 'No files uploaded' });
      return;
    }

    const file = uploadedFiles[0];
    const fs = await import('fs');
    let buffer: Buffer | null = file.buffer || null;
    if (!buffer && file.path && fs.existsSync(file.path)) {
      buffer = fs.readFileSync(file.path);
      try { fs.unlinkSync(file.path); } catch (e) {}
    }

    if (!buffer) {
      res.status(400).json({ success: false, error: 'Failed to read uploaded file buffer' });
      return;
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase();

    if (ext === 'zip' || ext === 'rar' || ext === 'pdf' || ext === 'doc' || ext === 'docx') {
      const result = await this.resumeBankService.bulkUploadResumes(
        ctx,
        [{ buffer, originalname: file.originalname }],
        {
          jobId: req.body.jobId ? Number(req.body.jobId) : undefined,
          source: req.body.source || 'bulk_import',
        }
      );

      res.status(202).json({
        success: true,
        data: result,
        message: `Processed ${file.originalname}. Success: ${result.successCount}, Failed: ${result.failedCount}`,
      });
      return;
    }

    const csvContent = buffer.toString('utf8');
    const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length <= 1) {
      res.status(400).json({ success: false, error: 'CSV file is empty or missing headers' });
      return;
    }

    const targetJobId = req.body.jobId || req.body.targetJobId ? parseInt(req.body.jobId || req.body.targetJobId, 10) : null;
    const autoShortlist = req.body.autoShortlist === 'true' || req.body.autoShortlist === true;

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    const parsedEntries: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || '';
      });
      parsedEntries.push({
        name: rowObj['name'] || rowObj['candidate name'] || rowObj['candidatename'] || '',
        email: rowObj['email'] || rowObj['email id'] || rowObj['emailid'] || '',
        contact: rowObj['contact'] || rowObj['contact number'] || rowObj['phone'] || rowObj['mobile'] || '',
        gender: rowObj['gender'] || 'Male',
        dob: rowObj['dob'] || rowObj['date of birth'] || '',
        qualification: rowObj['qualification'] || '',
        company: rowObj['company'] || rowObj['current company'] || '',
        totalExp: rowObj['total experience'] || rowObj['totalexp'] || rowObj['experience'] || '',
        skills: rowObj['skills'] || '',
        source: 'bulk_import',
        position: rowObj['position'] || rowObj['role'] || '',
        jobId: targetJobId || undefined,
        fileName: file.originalname,
      });
    }

    const fileNameSummary = uploadedFiles.length === 1 
      ? uploadedFiles[0].originalname 
      : `${uploadedFiles[0].originalname} + ${uploadedFiles.length - 1} more file(s)`;

    const log = await this.resumeBankService.createUploadLog(ctx, fileNameSummary, parsedEntries.length, targetJobId);

    const { resumeScreeningEngine } = await import('../services/ResumeScreeningEngine');
    const { jobAiService } = await import('../services/JobAiService');
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const activeJobs = await db('jobs')
      .where({ organization_id: ctx.organizationId })
      .whereNull('deleted_at')
      .orderBy('id', 'desc');

    let aiSettings: any = null;
    if (targetJobId) {
      aiSettings = await jobAiService.getJobAiSettings(ctx, targetJobId).catch(() => null);
    }

    let successCount = 0;
    let failedCount = 0;
    let atsPassedCount = 0;
    let jdMatchPassedCount = 0;
    let aiShortlistedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < parsedEntries.length; i++) {
      const entry: any = parsedEntries[i];
      try {
        if (!entry.name || !entry.email) {
          throw new Error(`Entry #${i + 1} (${entry.fileName || 'file'}): Name and Email are required`);
        }

        // Determine effective target job for screening
        let effectiveJobId = targetJobId;
        if (!effectiveJobId && activeJobs.length > 0) {
          const candidatePos = (entry.position || '').toLowerCase();
          const candidateSkills = (entry.skills || '').toLowerCase();

          const matchedJob = activeJobs.find(j => {
            const title = (j.job_title || j.title || '').toLowerCase();
            return (candidatePos && title.includes(candidatePos)) || (title && candidateSkills.includes(title));
          }) || activeJobs[0];

          effectiveJobId = matchedJob ? matchedJob.id : null;
        }

        if (effectiveJobId) {
          entry.jobId = effectiveJobId;
        }

        const createdEntry = await this.resumeBankService.addEntry(ctx, entry);
        successCount++;

        // Run AI ATS Screening & JD Matching
        const candId = createdEntry?.candidate?.id;
        if (effectiveJobId && candId) {
          try {
            const jobSettings = effectiveJobId === targetJobId && aiSettings
              ? aiSettings
              : await jobAiService.getJobAiSettings(ctx, effectiveJobId).catch(() => null);

            const screeningRes = await resumeScreeningEngine.screenCandidateForJob(
              ctx,
              candId,
              effectiveJobId,
              {
                persist: true,
                autoShortlistIfEligible: autoShortlist || (jobSettings?.autoShortlistEnabled ?? false),
              }
            );

            const atsThreshold = jobSettings?.atsThreshold || 85;
            const jdThreshold = jobSettings?.jdMatchThreshold || 80;

            if (screeningRes.atsScore >= atsThreshold) atsPassedCount++;
            if (screeningRes.jdMatchScore >= jdThreshold) jdMatchPassedCount++;
            if (screeningRes.recommendation === 'SHORTLIST' && (autoShortlist || jobSettings?.autoShortlistEnabled)) {
              aiShortlistedCount++;
            }
          } catch (screeningErr: any) {
            console.warn(`[BulkUpload AI Screening] Error screening candidate #${candId}:`, screeningErr.message);
          }
        }
      } catch (err: any) {
        failedCount++;
        errors.push(`Entry #${i + 1} (${entry.fileName || 'file'}): ${err.message || 'Unknown error'}`);
      }
    }

    await this.resumeBankService.updateUploadLog(
      ctx,
      log.id,
      successCount,
      failedCount,
      errors.length > 0 ? errors : null,
      { atsPassedCount, jdMatchPassedCount, aiShortlistedCount }
    );

    res.status(202).json({
      success: true,
      data: {
        ...log,
        successCount,
        failedCount,
        atsPassedCount,
        jdMatchPassedCount,
        aiShortlistedCount,
      },
      message: `Processed ${parsedEntries.length} candidate resumes/records from ${uploadedFiles.length} file(s). Success: ${successCount}, Failed: ${failedCount}${targetJobId ? ` | ATS Passed (>=85): ${atsPassedCount}, JD Match Passed (>=80): ${jdMatchPassedCount}, AI Shortlisted: ${aiShortlistedCount}` : ''}`,
    });
  });

  getUploadLogs = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.resumeBankService.getUploadLogs(ctx, {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  exportCsv = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;

    const csvContent = await this.resumeBankService.exportCsv(ctx);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="resume_bank_export.csv"');
    res.send(csvContent);
  });
}

export const resumeBankController = new ResumeBankController();
