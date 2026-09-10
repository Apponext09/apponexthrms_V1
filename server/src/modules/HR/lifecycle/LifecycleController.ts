import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { LifecycleService } from './LifecycleService';

export class LifecycleController {
  private lifecycleService: LifecycleService;

  constructor() {
    this.lifecycleService = new LifecycleService();
  }

  getEmployeeLifecycleSummaries = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const search = req.query.search as string | undefined;
    const stage = req.query.stage as string | undefined;
    const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
    
    const rawCompanyId = req.query.companyId as string | undefined;
    let companyId: number | undefined;
    let showAllCompanies = false;

    if (rawCompanyId === 'all') {
      showAllCompanies = true;
    } else if (rawCompanyId) {
      const parsed = Number(rawCompanyId);
      if (!isNaN(parsed) && parsed > 0) {
        companyId = parsed;
      }
    } else if (ctx.companyId) {
      companyId = ctx.companyId;
    }

    const data = await this.lifecycleService.getAllEmployeeLifecycleSummaries(ctx, {
      search,
      stage,
      departmentId,
      companyId,
      showAllCompanies,
    });

    res.json({ success: true, data });
  });

  getEmployeeLifecycleDetails = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const rawId = req.params.id;
    const employeeId = Number(rawId);

    if (!rawId || isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID' });
    }

    const data = await this.lifecycleService.getEmployeeLifecycleDetails(ctx, employeeId);
    res.json({ success: true, data });
  });

  transferEmployee = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const {
      employeeId,
      toDepartmentId,
      toDesignationId,
      toLocationId,
      toReportingManagerId,
      effectiveDate,
      transferType,
      transferReason,
      notes,
    } = req.body;

    const result = await this.lifecycleService.transferEmployee(ctx, {
      employeeId: Number(employeeId),
      toDepartmentId: toDepartmentId ? Number(toDepartmentId) : undefined,
      toDesignationId: toDesignationId ? Number(toDesignationId) : undefined,
      toLocationId: toLocationId ? Number(toLocationId) : undefined,
      toReportingManagerId: toReportingManagerId ? Number(toReportingManagerId) : undefined,
      effectiveDate,
      transferType,
      transferReason,
      notes,
    });

    res.json({ success: true, data: result });
  });

  saveOnboardingDetails = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { employeeId } = req.params;

    const result = await this.lifecycleService.saveOnboardingDetails(ctx, {
      employeeId: Number(employeeId),
      ...req.body,
    });

    res.json({ success: true, data: result });
  });

  saveOffboardingDetails = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { employeeId } = req.params;

    const result = await this.lifecycleService.saveOffboardingDetails(ctx, {
      employeeId: Number(employeeId),
      ...req.body,
    });

    res.json({ success: true, data: result });
  });

  getManagers = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const rawCompanyId = req.query.companyId as string | undefined;
    let companyId: number | undefined = ctx.companyId;

    if (rawCompanyId === 'all') {
      companyId = undefined;
    } else if (rawCompanyId) {
      const parsed = Number(rawCompanyId);
      if (!isNaN(parsed) && parsed > 0) {
        companyId = parsed;
      }
    }

    if (!companyId) {
      const { getKnex } = await import('../../../db/knex');
      const db = getKnex();
      const parentComp = await db('company')
        .where('organization_id', ctx.organizationId)
        .where((b) => b.where('is_parent', 1).orWhere('is_parent', true))
        .whereNull('deleted_at')
        .first();
      if (parentComp) {
        companyId = Number((parentComp as any).companyId || (parentComp as any).company_id || (parentComp as any).id);
      }
    }

    const managers = await this.lifecycleService.getManagersList({ ...ctx, companyId });
    res.json({ success: true, data: managers });
  });
}

export const lifecycleController = new LifecycleController();
