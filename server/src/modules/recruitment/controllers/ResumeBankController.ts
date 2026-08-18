import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate';
import { ResumeBankService } from '../services/ResumeBankService';
import { createResumeBankEntrySchema, shortlistResumeSchema } from '../types/mrf';

export class ResumeBankController {
  private resumeBankService: ResumeBankService;

  constructor() {
    this.resumeBankService = new ResumeBankService();
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

    const { parseUploadedFiles } = await import('../services/ResumeFileParser');
    const parsedEntries = await parseUploadedFiles(uploadedFiles);

    if (parsedEntries.length === 0) {
      res.status(400).json({ success: false, error: 'No valid candidate records or resumes could be extracted from the uploaded files. Supported formats: PDF, DOCX, DOC, XLSX, CSV, TXT, ZIP.' });
      return;
    }

    const targetJobId = req.body.jobId || req.body.targetJobId ? parseInt(req.body.jobId || req.body.targetJobId, 10) : null;
    const autoShortlist = req.body.autoShortlist === 'true' || req.body.autoShortlist === true;

    const fileNameSummary = uploadedFiles.length === 1 
      ? uploadedFiles[0].originalname 
      : `${uploadedFiles[0].originalname} + ${uploadedFiles.length - 1} more file(s)`;

    const log = await this.resumeBankService.createUploadLog(ctx, fileNameSummary, parsedEntries.length, targetJobId);

    const { resumeScreeningEngine } = await import('../services/ResumeScreeningEngine');
    const { jobAiService } = await import('../services/JobAiService');

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

        if (targetJobId) {
          entry.jobId = targetJobId;
        }

        const createdEntry = await this.resumeBankService.addEntry(ctx, entry);
        successCount++;

        // Run AI ATS Screening & JD Matching if target job is set
        if (targetJobId && createdEntry?.candidate?.id) {
          try {
            const screeningRes = await resumeScreeningEngine.screenCandidateForJob(
              ctx,
              createdEntry.candidate.id,
              targetJobId,
              {
                persist: true,
                autoShortlistIfEligible: autoShortlist || (aiSettings?.autoShortlistEnabled ?? false),
              }
            );

            const atsThreshold = aiSettings?.atsThreshold || 85;
            const jdThreshold = aiSettings?.jdMatchThreshold || 80;

            if (screeningRes.atsScore >= atsThreshold) atsPassedCount++;
            if (screeningRes.jdMatchScore >= jdThreshold) jdMatchPassedCount++;
            if (screeningRes.recommendation === 'SHORTLIST' && (autoShortlist || aiSettings?.autoShortlistEnabled)) {
              aiShortlistedCount++;
            }
          } catch (screeningErr: any) {
            console.warn(`[BulkUpload AI Screening] Error screening candidate #${createdEntry.candidate.id}:`, screeningErr.message);
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
      targetJobId ? { atsPassedCount, jdMatchPassedCount, aiShortlistedCount } : undefined
    );

    // Clean up temp files
    const fs = await import('fs');
    for (const f of uploadedFiles) {
      try { fs.unlinkSync(f.path); } catch (e) {}
    }

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
