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

    const data = await this.lifecycleService.getAllEmployeeLifecycleSummaries(ctx, {
      search,
      stage,
      departmentId,
    });

    res.json({ success: true, data });
  });

  getEmployeeLifecycleDetails = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const employeeId = Number(req.params.id);

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
}

export const lifecycleController = new LifecycleController();
