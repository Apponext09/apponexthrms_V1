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
    const file = (req as any).file;
    if (!file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const fs = await import('fs');
    const csvContent = fs.readFileSync(file.path, 'utf8');
    const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length <= 1) {
      res.status(400).json({ success: false, error: 'CSV file is empty or missing headers' });
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    const dataRows = lines.slice(1);
    
    const log = await this.resumeBankService.createUploadLog(ctx, file.originalname, dataRows.length);

    // Process asynchronously (or synchronously here since we are in dev/local mode and it is very fast)
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      try {
        const row = dataRows[i].split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''));
        const entry: any = {};
        
        headers.forEach((header, index) => {
          const val = row[index];
          if (header === 'name') entry.name = val;
          else if (header === 'email') entry.email = val;
          else if (header === 'contact' || header === 'phone') entry.contact = val;
          else if (header === 'position') entry.position = val;
          else if (header === 'source') entry.source = val;
          else if (header === 'totalexp' || header === 'experience') entry.totalExp = val;
          else if (header === 'skills') entry.skills = val;
          else if (header === 'qualification') entry.qualification = val;
          else if (header === 'university') entry.university = val;
          else if (header === 'country') entry.country = val;
          else if (header === 'state') entry.state = val;
          else if (header === 'city') entry.city = val;
          else if (header === 'dob') entry.dob = val;
          else if (header === 'gender') entry.gender = val;
          else if (header === 'maritalstatus') entry.maritalStatus = val;
        });

        if (!entry.name || !entry.email) {
          throw new Error(`Row ${i + 2}: Name and Email are required fields`);
        }

        await this.resumeBankService.addEntry(ctx, entry);
        successCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`Row ${i + 2}: ${err.message || 'Unknown error'}`);
      }
    }

    await this.resumeBankService.updateUploadLog(ctx, log.id, successCount, failedCount, errors.length > 0 ? errors : null);

    // Clean up temp file
    try { fs.unlinkSync(file.path); } catch (e) {}

    res.status(202).json({
      success: true,
      data: log,
      message: `Processed ${dataRows.length} rows. Success: ${successCount}, Failed: ${failedCount}`,
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
