import { v4 as uuidv4 } from 'uuid';
import { AssetRepository, type Asset } from '../repositories/AssetRepository';
import { EmployeeAssetAllocationRepository } from '../repositories/EmployeeAssetAllocationRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class AssetService {
  private assetRepo: AssetRepository;
  private allocationRepo: EmployeeAssetAllocationRepository;
  private auditService: AuditService;

  constructor() {
    this.assetRepo = new AssetRepository();
    this.allocationRepo = new EmployeeAssetAllocationRepository();
    this.auditService = new AuditService();
  }

  /**
   * Create a new asset
   */
  async createAsset(ctx: TenantContext, input: {
    assetTypeId: number;
    assetCode: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    purchaseDate?: string;
    purchasePrice?: number;
    currency?: string;
  }): Promise<Asset> {
    const isUnique = await this.assetRepo.isCodeUnique(ctx, input.assetCode);
    if (!isUnique) {
      throw new ValidationError(`Asset code '${input.assetCode}' already exists`);
    }

    const asset = await this.assetRepo.create(ctx, {
      uuid: uuidv4(),
      asset_type_id: input.assetTypeId,
      asset_code: input.assetCode,
      brand: input.brand || null,
      model: input.model || null,
      serial_number: input.serialNumber || null,
      purchase_date: input.purchaseDate || null,
      purchase_price: input.purchasePrice || null,
      currency: input.currency || 'INR',
      status: 'available',
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'ASSET',
      entityId: asset.id,
      afterState: {
        assetCode: input.assetCode,
        brand: input.brand,
      },
    });

    return asset;
  }

  /**
   * Allocate asset to employee
   */
  async allocateAsset(ctx: TenantContext, input: {
    employeeId: number;
    assetId: number;
    allocationDate: string;
    conditionAtAllocation?: string;
    notes?: string;
  }) {
    const asset = await this.assetRepo.getById(ctx, input.assetId);
    if (!asset) {
      throw new NotFoundError('Asset not found');
    }

    if (asset.status !== 'available') {
      throw new ValidationError('Asset is not available for allocation');
    }

    // Create allocation
    const allocation = await this.allocationRepo.create(ctx, {
      uuid: uuidv4(),
      employee_id: input.employeeId,
      asset_id: input.assetId,
      allocation_date: input.allocationDate,
      condition_at_allocation: input.conditionAtAllocation || 'good',
      notes: input.notes || null,
    } as any);

    // Update asset status
    await this.assetRepo.update(ctx, input.assetId, {
      status: 'allocated',
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'ASSET_ALLOCATION',
      entityId: allocation.id,
      changeDescription: `Asset ${asset.asset_code} allocated to employee ${input.employeeId}`,
    });

    return allocation;
  }

  /**
   * Return asset from employee
   */
  async returnAsset(ctx: TenantContext, allocationId: number, input: {
    returnDate: string;
    conditionAtReturn?: string;
    notes?: string;
  }) {
    const allocation = await this.allocationRepo.getById(ctx, allocationId);
    if (!allocation) {
      throw new NotFoundError('Allocation not found');
    }

    if (allocation.return_date) {
      throw new ValidationError('Asset has already been returned');
    }

    // Update allocation
    const updated = await this.allocationRepo.update(ctx, allocationId, {
      return_date: input.returnDate,
      condition_at_return: input.conditionAtReturn || 'good',
      notes: input.notes || allocation.notes,
    } as any);

    // Update asset status back to available
    await this.assetRepo.update(ctx, allocation.asset_id, {
      status: 'available',
    } as any);

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'ASSET_ALLOCATION',
      entityId: allocationId,
      changeDescription: `Asset returned by employee ${allocation.employee_id}`,
    });

    return updated;
  }

  /**
   * List assets
   */
  async listAssets(ctx: TenantContext, options?: ListQueryOptions) {
    return this.assetRepo.list(ctx, options);
  }

  /**
   * Get employee assets
   */
  async getEmployeeAssets(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.allocationRepo.getByEmployee(ctx, employeeId, options);
  }
}
