import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate';
import { MrfService } from '../services/MrfService';
import { MrfTableSettingsRepository } from '../repositories/MrfTableSettingsRepository';
import {
  createMrfRequestSchema,
  updateMrfRequestSchema,
  mrfApprovalSchema,
  mrfTableSettingsSchema,
} from '../types/mrf';

export class MrfController {
  private mrfService: MrfService;
  private settingsRepo: MrfTableSettingsRepository;

  constructor() {
    this.mrfService = new MrfService();
    this.settingsRepo = new MrfTableSettingsRepository();
  }

  // ==================== MRF CRUD ====================

  createMrf = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, createMrfRequestSchema);

    const mrf = await this.mrfService.createMrf(ctx, validated);

    res.status(201).json({ success: true, data: mrf });
  });

  listMrfs = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const {
      page = 1,
      pageSize = 20,
      mrNumber,
      positionTitle,
      status,
      departmentId,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search,
    } = req.query;

    const { recruitmentExpiryService } = await import('../services/RecruitmentExpiryService');
    await recruitmentExpiryService.closeExpiredRecords(ctx);

    const result = await this.mrfService.listMrfs(ctx, {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
      search: search as string,
      mrNumber: mrNumber as string,
      positionTitle: positionTitle as string,
      status: status as 'Open' | 'Closed',
      departmentId: departmentId ? parseInt(departmentId as string, 10) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getMrf = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const mrf = await this.mrfService.getMrf(ctx, parseInt(id, 10));

    if (!mrf) {
      res.status(404).json({ success: false, error: 'MRF Request not found' });
      return;
    }

    res.json({ success: true, data: mrf });
  });

  updateMrf = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const validated = validate(req.body, updateMrfRequestSchema);

    const mrf = await this.mrfService.updateMrf(ctx, parseInt(id, 10), validated);

    res.json({ success: true, data: mrf });
  });

  deleteMrf = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    await this.mrfService.deleteMrf(ctx, parseInt(id, 10));

    res.json({ success: true, message: 'MRF Request deleted' });
  });

  // ==================== Approval ====================

  approveMrf = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const validated = validate(req.body, mrfApprovalSchema);

    try {
      const mrf = await this.mrfService.approveMrf(ctx, parseInt(id, 10), validated.comment);
      res.json({ success: true, data: mrf });
    } catch (err: any) {
      console.error('Approve MRF error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to approve MRF' });
    }
  });

  rejectMrf = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const validated = validate(req.body, mrfApprovalSchema);

    try {
      const mrf = await this.mrfService.rejectMrf(ctx, parseInt(id, 10), validated.comment);
      res.json({ success: true, data: mrf });
    } catch (err: any) {
      console.error('Reject MRF error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to reject MRF' });
    }
  });

  getAuditLog = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const log = await this.mrfService.getAuditLog(ctx, parseInt(id, 10));

    res.json({ success: true, data: log });
  });

  addAction = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { status, comment } = req.body;

    if (!status || status === 'Choose') {
      res.status(400).json({ success: false, message: 'Status is required' });
      return;
    }

    const log = await this.mrfService.addAction(ctx, parseInt(id, 10), status, comment);
    res.json({ success: true, data: log });
  });

  // ==================== Copy Link ====================

  copyLink = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const mrf = await this.mrfService.getMrf(ctx, parseInt(id, 10));
    if (!mrf) {
      res.status(404).json({ success: false, error: 'MRF Request not found' });
      return;
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const link = this.mrfService.generateReferenceLink(baseUrl, (mrf as any).id, (mrf as any).mrNumber);

    res.json({ success: true, data: { link } });
  });

  // ==================== Table Settings ====================

  getSettings = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { configType } = req.params;

    const settings = await this.settingsRepo.getByUserAndType(ctx, ctx.userId, configType);

    res.json({
      success: true,
      data: settings ? (settings.settings_json ? JSON.parse(settings.settings_json as string) : null) : null,
    });
  });

  saveSettings = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { configType } = req.params;
    const { settingsJson } = req.body;

    const result = await this.settingsRepo.upsert(ctx, ctx.userId, configType, settingsJson);

    res.json({ success: true, data: result });
  });
}

export const mrfController = new MrfController();
