import { AssetVendorRepository } from '../repositories/AssetVendorRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';

export class AssetVendorService {
  private vendorRepo: AssetVendorRepository;
  private auditService: AuditService;

  constructor() {
    this.vendorRepo = new AssetVendorRepository();
    this.auditService = new AuditService();
  }

  async list(ctx: TenantContext, options = {}) {
    return this.vendorRepo.list(ctx, options);
  }

  async getById(ctx: TenantContext, id: number) {
    const vendor = await this.vendorRepo.getById(ctx, id);
    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }
    return vendor;
  }

  async create(ctx: TenantContext, data: any) {
    const vendor = await this.vendorRepo.create(ctx, data);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'ASSET_VENDOR',
      entityId: vendor.id,
      afterState: vendor,
    });

    return vendor;
  }

  async update(ctx: TenantContext, id: number, data: any) {
    const vendor = await this.getById(ctx, id);
    const updated = await this.vendorRepo.update(ctx, id, data);

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'ASSET_VENDOR',
      entityId: id,
      beforeState: vendor,
      afterState: updated,
    });

    return updated;
  }

  async delete(ctx: TenantContext, id: number) {
    const vendor = await this.getById(ctx, id);
    await this.vendorRepo.delete(ctx, id);

    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'ASSET_VENDOR',
      entityId: id,
      beforeState: vendor,
    });
  }
}
