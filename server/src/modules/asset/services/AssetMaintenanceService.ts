import { AssetMaintenanceRepository } from '../repositories/AssetMaintenanceRepository';
import { AssetRepository } from '../repositories/AssetRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';

export class AssetMaintenanceService {
  private maintenanceRepo: AssetMaintenanceRepository;
  private assetRepo: AssetRepository;
  private auditService: AuditService;

  constructor() {
    this.maintenanceRepo = new AssetMaintenanceRepository();
    this.assetRepo = new AssetRepository();
    this.auditService = new AuditService();
  }

  async list(ctx: TenantContext, options = {}) {
    return this.maintenanceRepo.list(ctx, options);
  }

  async getById(ctx: TenantContext, id: number) {
    const maintenance = await this.maintenanceRepo.getById(ctx, id);
    if (!maintenance) {
      throw new NotFoundError('Maintenance record not found');
    }
    return maintenance;
  }

  async create(ctx: TenantContext, data: any) {
    const maintenance = await this.maintenanceRepo.create(ctx, {
      ...data,
      status: 'pending',
    });

    // Update asset status
    await this.assetRepo.update(ctx, data.assetId, {
      status: 'repair',
    });

    await this.auditService.log(ctx, {
      action: 'CREATE_MAINTENANCE',
      entityType: 'ASSET_MAINTENANCE',
      entityId: maintenance.id,
      afterState: maintenance,
    });

    return maintenance;
  }

  async complete(ctx: TenantContext, id: number, data: any) {
    const maintenance = await this.getById(ctx, id);

    const updated = await this.maintenanceRepo.update(ctx, id, {
      ...data,
      status: 'completed',
      completedBy: ctx.userId,
      endDate: new Date().toISOString().split('T')[0],
    });

    // Update asset status back to available
    await this.assetRepo.update(ctx, maintenance.assetId, {
      status: 'available',
    });

    await this.auditService.log(ctx, {
      action: 'COMPLETE_MAINTENANCE',
      entityType: 'ASSET_MAINTENANCE',
      entityId: id,
      afterState: updated,
    });

    return updated;
  }

  async getByAsset(ctx: TenantContext, assetId: number) {
    return this.maintenanceRepo.getByAsset(ctx, assetId);
  }

  async getActive(ctx: TenantContext) {
    return this.maintenanceRepo.getActive(ctx);
  }
}
