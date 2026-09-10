import { AssetReturnRepository } from '../repositories/AssetReturnRepository';
import { AssetAssignmentRepository } from '../repositories/AssetAssignmentRepository';
import { AssetRepository } from '../repositories/AssetRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';

export class AssetReturnService {
  private returnRepo: AssetReturnRepository;
  private assignmentRepo: AssetAssignmentRepository;
  private assetRepo: AssetRepository;
  private auditService: AuditService;

  constructor() {
    this.returnRepo = new AssetReturnRepository();
    this.assignmentRepo = new AssetAssignmentRepository();
    this.assetRepo = new AssetRepository();
    this.auditService = new AuditService();
  }

  async list(ctx: TenantContext, options = {}) {
    return this.returnRepo.list(ctx, options);
  }

  async requestReturn(ctx: TenantContext, data: any) {
    const asset = await this.assetRepo.getById(ctx, data.assetId);
    if (!asset) {
      throw new NotFoundError('Asset not found');
    }

    const assetReturn = await this.returnRepo.create(ctx, {
      ...data,
      status: 'pending',
      receivedBy: ctx.userId,
    });

    await this.auditService.log(ctx, {
      action: 'REQUEST_RETURN',
      entityType: 'ASSET_RETURN',
      entityId: assetReturn.id,
      afterState: assetReturn,
    });

    return assetReturn;
  }

  async processReturn(ctx: TenantContext, id: number) {
    const assetReturn = await this.returnRepo.getById(ctx, id);
    if (!assetReturn) {
      throw new NotFoundError('Return not found');
    }

    // Update return status
    const updated = await this.returnRepo.update(ctx, id, {
      status: 'completed',
      receivedDate: new Date(),
    });

    // Update assignment
    const assignment = await this.assignmentRepo.getByAsset(ctx, assetReturn.assetId);
    if (assignment) {
      await this.assignmentRepo.update(ctx, assignment.id, {
        status: 'returned',
      });
    }

    // Determine asset status
    let newStatus = 'available';
    if (assetReturn.condition === 'lost') {
      newStatus = 'lost';
    } else if (assetReturn.condition === 'major_damage') {
      newStatus = 'repair';
    }

    // Update asset
    await this.assetRepo.update(ctx, assetReturn.assetId, {
      status: newStatus,
      condition: assetReturn.condition === 'good' ? 'good' : 'fair',
      currentOwnerId: null,
    });

    await this.auditService.log(ctx, {
      action: 'PROCESS_RETURN',
      entityType: 'ASSET_RETURN',
      entityId: id,
      afterState: updated,
    });

    return updated;
  }

  async getPending(ctx: TenantContext) {
    return this.returnRepo.getPending(ctx);
  }
}
