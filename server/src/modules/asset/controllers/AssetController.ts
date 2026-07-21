import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { AssetService } from '../services/AssetService';
import { AssetCategoryService } from '../services/AssetCategoryService';
import { AssetAssignmentService } from '../services/AssetAssignmentService';
import { AssetTransferService } from '../services/AssetTransferService';
import { AssetReturnService } from '../services/AssetReturnService';
import { AssetMaintenanceService } from '../services/AssetMaintenanceService';
import { SoftwareLicenseService } from '../services/SoftwareLicenseService';
import { AssetRequestService } from '../services/AssetRequestService';
import { AssetVendorService } from '../services/AssetVendorService';
import type { ApiResponse } from '@apponexthrms/shared';

export class AssetController {
  private assetService: AssetService;
  private categoryService: AssetCategoryService;
  private assignmentService: AssetAssignmentService;
  private transferService: AssetTransferService;
  private returnService: AssetReturnService;
  private maintenanceService: AssetMaintenanceService;
  private licenseService: SoftwareLicenseService;
  private requestService: AssetRequestService;
  private vendorService: AssetVendorService;

  constructor() {
    this.assetService = new AssetService();
    this.categoryService = new AssetCategoryService();
    this.assignmentService = new AssetAssignmentService();
    this.transferService = new AssetTransferService();
    this.returnService = new AssetReturnService();
    this.maintenanceService = new AssetMaintenanceService();
    this.licenseService = new SoftwareLicenseService();
    this.requestService = new AssetRequestService();
    this.vendorService = new AssetVendorService();
  }

  // ===== ASSETS =====

  listAssets = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { page, pageSize, search, category, status } = req.query;

    const result = await this.assetService.list(ctx, {
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
      search: search as string,
      category: category as string,
      status: status as string,
    });

    res.json({ success: true, data: result.items, meta: result.meta } as ApiResponse);
  });

  getAsset = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { id } = req.params;

    const asset = await this.assetService.getById(ctx, parseInt(id));
    res.json({ success: true, data: asset } as ApiResponse);
  });

  createAsset = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const asset = await this.assetService.create(ctx, req.body);

    res.status(201).json({ success: true, data: asset } as ApiResponse);
  });

  updateAsset = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { id } = req.params;

    const asset = await this.assetService.update(ctx, parseInt(id), req.body);
    res.json({ success: true, data: asset } as ApiResponse);
  });

  deleteAsset = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { id } = req.params;

    await this.assetService.delete(ctx, parseInt(id));
    res.json({ success: true, message: 'Asset deleted' } as ApiResponse);
  });

  getStats = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const stats = await this.assetService.getStats(ctx);
    res.json({ success: true, data: stats } as ApiResponse);
  });

  // ===== CATEGORIES =====

  listCategories = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { page, pageSize, search } = req.query;

    const result = await this.categoryService.list(ctx, {
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
      search: search as string,
    });

    res.json({ success: true, data: result.items, meta: result.meta } as ApiResponse);
  });

  createCategory = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const category = await this.categoryService.create(ctx, req.body);

    res.status(201).json({ success: true, data: category } as ApiResponse);
  });

  updateCategory = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { id } = req.params;

    const category = await this.categoryService.update(ctx, parseInt(id), req.body);
    res.json({ success: true, data: category } as ApiResponse);
  });

  // ===== ASSIGNMENTS =====

  listAssignments = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { page, pageSize } = req.query;

    const result = await this.assignmentService.list(ctx, {
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    });

    res.json({ success: true, data: result.items, meta: result.meta } as ApiResponse);
  });

  assignAsset = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const assignment = await this.assignmentService.assign(ctx, req.body);

    res.status(201).json({ success: true, data: assignment } as ApiResponse);
  });

  getMyAssets = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const assets = await this.assignmentService.getActiveAssignments(ctx, ctx.userId);

    res.json({ success: true, data: assets } as ApiResponse);
  });

  // ===== TRANSFERS =====

  listTransfers = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { page, pageSize } = req.query;

    const result = await this.transferService.list(ctx, {
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    });

    res.json({ success: true, data: result.items, meta: result.meta } as ApiResponse);
  });

  requestTransfer = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const transfer = await this.transferService.requestTransfer(ctx, req.body);

    res.status(201).json({ success: true, data: transfer } as ApiResponse);
  });

  approveTransfer = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { id } = req.params;

    const transfer = await this.transferService.approveTransfer(ctx, parseInt(id));
    res.json({ success: true, data: transfer } as ApiResponse);
  });

  rejectTransfer = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { id } = req.params;

    const transfer = await this.transferService.rejectTransfer(ctx, parseInt(id));
    res.json({ success: true, data: transfer } as ApiResponse);
  });

  // ===== RETURNS =====

  listReturns = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { page, pageSize } = req.query;

    const result = await this.returnService.list(ctx, {
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    });

    res.json({ success: true, data: result.items, meta: result.meta } as ApiResponse);
  });

  requestReturn = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const assetReturn = await this.returnService.requestReturn(ctx, req.body);

    res.status(201).json({ success: true, data: assetReturn } as ApiResponse);
  });

  processReturn = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { id } = req.params;

    const assetReturn = await this.returnService.processReturn(ctx, parseInt(id));
    res.json({ success: true, data: assetReturn } as ApiResponse);
  });

  // ===== MAINTENANCE =====

  listMaintenance = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { page, pageSize } = req.query;

    const result = await this.maintenanceService.list(ctx, {
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    });

    res.json({ success: true, data: result.items, meta: result.meta } as ApiResponse);
  });

  createMaintenance = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const maintenance = await this.maintenanceService.create(ctx, req.body);

    res.status(201).json({ success: true, data: maintenance } as ApiResponse);
  });

  completeMaintenance = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { id } = req.params;

    const maintenance = await this.maintenanceService.complete(ctx, parseInt(id), req.body);
    res.json({ success: true, data: maintenance } as ApiResponse);
  });

  // ===== SOFTWARE LICENSES =====

  listLicenses = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { page, pageSize, search } = req.query;

    const result = await this.licenseService.list(ctx, {
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
      search: search as string,
    });

    res.json({ success: true, data: result.items, meta: result.meta } as ApiResponse);
  });

  createLicense = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const license = await this.licenseService.create(ctx, req.body);

    res.status(201).json({ success: true, data: license } as ApiResponse);
  });

  updateLicense = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { id } = req.params;

    const license = await this.licenseService.update(ctx, parseInt(id), req.body);
    res.json({ success: true, data: license } as ApiResponse);
  });

  getExpiringLicenses = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const licenses = await this.licenseService.getExpiring(ctx);

    res.json({ success: true, data: licenses } as ApiResponse);
  });

  // ===== ASSET REQUESTS =====

  listRequests = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { page, pageSize } = req.query;

    const result = await this.requestService.list(ctx, {
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    });

    res.json({ success: true, data: result.items, meta: result.meta } as ApiResponse);
  });

  createRequest = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const assetRequest = await this.requestService.create(ctx, req.body);

    res.status(201).json({ success: true, data: assetRequest } as ApiResponse);
  });

  approveRequest = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { id } = req.params;

    const assetRequest = await this.requestService.approve(ctx, parseInt(id));
    res.json({ success: true, data: assetRequest } as ApiResponse);
  });

  rejectRequest = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { id } = req.params;

    const assetRequest = await this.requestService.reject(ctx, parseInt(id));
    res.json({ success: true, data: assetRequest } as ApiResponse);
  });

  // ===== VENDORS =====

  listVendors = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { page, pageSize, search } = req.query;

    const result = await this.vendorService.list(ctx, {
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
      search: search as string,
    });

    res.json({ success: true, data: result.items, meta: result.meta } as ApiResponse);
  });

  createVendor = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const vendor = await this.vendorService.create(ctx, req.body);

    res.status(201).json({ success: true, data: vendor } as ApiResponse);
  });

  updateVendor = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { id } = req.params;

    const vendor = await this.vendorService.update(ctx, parseInt(id), req.body);
    res.json({ success: true, data: vendor } as ApiResponse);
  });

  deleteVendor = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!!;
    const { id } = req.params;

    await this.vendorService.delete(ctx, parseInt(id));
    res.json({ success: true, message: 'Vendor deleted' } as ApiResponse);
  });
}

export const assetController = new AssetController();

