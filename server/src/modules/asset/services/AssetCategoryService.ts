import { AssetCategoryRepository } from '../repositories/AssetCategoryRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';
import type { AssetCategory } from '../asset.types';

export class AssetCategoryService {
  private categoryRepo: AssetCategoryRepository;
  private auditService: AuditService;

  constructor() {
    this.categoryRepo = new AssetCategoryRepository();
    this.auditService = new AuditService();
  }

  async list(ctx: TenantContext, options = {}) {
    return this.categoryRepo.list(ctx, options);
  }

  async getById(ctx: TenantContext, id: number): Promise<AssetCategory> {
    const category = await this.categoryRepo.getById(ctx, id);
    if (!category) {
      throw new NotFoundError('Asset category not found');
    }
    return category;
  }

  async create(ctx: TenantContext, data: any): Promise<AssetCategory> {
    const existing = await this.categoryRepo.getByCode(ctx, data.code);
    if (existing) {
      throw new ValidationError('Category code already exists');
    }

    const category = await this.categoryRepo.create(ctx, data);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'ASSET_CATEGORY',
      entityId: category.id,
      afterState: category,
    });

    return category;
  }

  async update(ctx: TenantContext, id: number, data: any): Promise<AssetCategory> {
    const category = await this.getById(ctx, id);
    const updated = await this.categoryRepo.update(ctx, id, data);

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'ASSET_CATEGORY',
      entityId: id,
      beforeState: category,
      afterState: updated,
    });

    return updated;
  }

  async delete(ctx: TenantContext, id: number): Promise<void> {
    const category = await this.getById(ctx, id);
    await this.categoryRepo.delete(ctx, id);

    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'ASSET_CATEGORY',
      entityId: id,
      beforeState: category,
    });
  }
}
