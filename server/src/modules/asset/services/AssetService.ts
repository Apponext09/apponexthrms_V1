import { AssetRepository } from '../repositories/AssetRepository';
import { AssetCategoryRepository } from '../repositories/AssetCategoryRepository';
import { AssetAssignmentRepository } from '../repositories/AssetAssignmentRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';
import type { Asset, AssetListQueryOptions } from '../asset.types';
import { v4 as uuidv4 } from 'uuid';

export class AssetService {
  private assetRepo: AssetRepository;
  private categoryRepo: AssetCategoryRepository;
  private assignmentRepo: AssetAssignmentRepository;
  private auditService: AuditService;

  constructor() {
    this.assetRepo = new AssetRepository();
    this.categoryRepo = new AssetCategoryRepository();
    this.assignmentRepo = new AssetAssignmentRepository();
    this.auditService = new AuditService();
  }

  async list(ctx: TenantContext, options: AssetListQueryOptions = {}) {
    return this.assetRepo.list(ctx, options);
  }

  async getById(ctx: TenantContext, id: number): Promise<Asset> {
    const asset = await this.assetRepo.getById(ctx, id);
    if (!asset) {
      throw new NotFoundError('Asset not found');
    }
    return asset;
  }

  async getByCode(ctx: TenantContext, code: string): Promise<Asset> {
    const asset = await this.assetRepo.getByCode(ctx, code);
    if (!asset) {
      throw new NotFoundError('Asset not found');
    }
    return asset;
  }

  async create(ctx: TenantContext, data: any): Promise<Asset> {
    // Validate category exists
    const category = await this.categoryRepo.getById(ctx, data.categoryId);
    if (!category) {
      throw new ValidationError('Asset category not found');
    }

    // Check for duplicate asset code
    const existing = await this.assetRepo.getByCode(ctx, data.assetCode);
    if (existing) {
      throw new ValidationError('Asset code already exists');
    }

    // Generate asset code if not provided
    let assetCode = data.assetCode;
    if (!assetCode) {
      const timestamp = Date.now();
      assetCode = `AST-${timestamp}`;
    }

    // Generate QR code
    const qrCode = data.qrCode || `QR-${uuidv4()}`;

    const asset = await this.assetRepo.create(ctx, {
      ...data,
      assetCode,
      qrCode,
      createdBy: ctx.userId,
    });

    // Audit log
    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'ASSET',
      entityId: asset.id,
      afterState: asset,
    });

    return asset;
  }

  async update(ctx: TenantContext, id: number, data: any): Promise<Asset> {
    const asset = await this.getById(ctx, id);

    const updated = await this.assetRepo.update(ctx, id, data);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'ASSET',
      entityId: id,
      beforeState: asset,
      afterState: updated,
    });

    return updated;
  }

  async delete(ctx: TenantContext, id: number): Promise<void> {
    const asset = await this.getById(ctx, id);

    await this.assetRepo.delete(ctx, id);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'ASSET',
      entityId: id,
      beforeState: asset,
    });
  }

  async getAvailable(ctx: TenantContext) {
    return this.assetRepo.getAvailable(ctx);
  }

  async getByOwner(ctx: TenantContext, employeeId: number) {
    return this.assetRepo.getByOwner(ctx, employeeId);
  }

  async getByCategory(ctx: TenantContext, categoryId: number) {
    return this.assetRepo.getByCategory(ctx, categoryId);
  }

  async getStats(ctx: TenantContext) {
    const list = await this.assetRepo.list(ctx, { pageSize: 10000 });

    const stats = {
      total: list.meta.total,
      assigned: 0,
      available: 0,
      maintenance: 0,
    };

    // Count by status from all items
    for (const asset of list.items) {
      if (asset.status === 'assigned') stats.assigned++;
      else if (asset.status === 'available') stats.available++;
      else if (asset.status === 'under_maintenance') stats.maintenance++;
    }

    return stats;
  }
}
