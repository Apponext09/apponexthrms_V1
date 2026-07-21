import { AssetTransferRepository } from '../repositories/AssetTransferRepository';
import { AssetAssignmentRepository } from '../repositories/AssetAssignmentRepository';
import { AssetRepository } from '../repositories/AssetRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';

export class AssetTransferService {
  private transferRepo: AssetTransferRepository;
  private assignmentRepo: AssetAssignmentRepository;
  private assetRepo: AssetRepository;
  private auditService: AuditService;

  constructor() {
    this.transferRepo = new AssetTransferRepository();
    this.assignmentRepo = new AssetAssignmentRepository();
    this.assetRepo = new AssetRepository();
    this.auditService = new AuditService();
  }

  async list(ctx: TenantContext, options = {}) {
    return this.transferRepo.list(ctx, options);
  }

  async requestTransfer(ctx: TenantContext, data: any) {
    const asset = await this.assetRepo.getById(ctx, data.assetId);
    if (!asset) {
      throw new NotFoundError('Asset not found');
    }

    const transfer = await this.transferRepo.create(ctx, {
      ...data,
      status: 'pending',
      requestedBy: ctx.userId,
    });

    await this.auditService.log(ctx, {
      action: 'REQUEST_TRANSFER',
      entityType: 'ASSET_TRANSFER',
      entityId: transfer.id,
      afterState: transfer,
    });

    return transfer;
  }

  async approveTransfer(ctx: TenantContext, id: number) {
    const transfer = await this.transferRepo.getById(ctx, id);
    if (!transfer) {
      throw new NotFoundError('Transfer not found');
    }

    if (transfer.status !== 'pending') {
      throw new ValidationError('Only pending transfers can be approved');
    }

    // Update transfer status
    const updated = await this.transferRepo.update(ctx, id, {
      status: 'completed',
      approvedBy: ctx.userId,
      approvalDate: new Date(),
    });

    // Update assignment
    const assignment = await this.assignmentRepo.getByAsset(ctx, transfer.assetId);
    if (assignment) {
      await this.assignmentRepo.update(ctx, assignment.id, {
        status: 'returned',
      });
    }

    // Create new assignment for new employee
    await this.assignmentRepo.create(ctx, {
      assetId: transfer.assetId,
      employeeId: transfer.toEmployeeId,
      assignmentType: 'permanent',
      assignedDate: new Date().toISOString().split('T')[0],
      status: 'active',
      assignedBy: ctx.userId,
    });

    // Update asset owner
    await this.assetRepo.update(ctx, transfer.assetId, {
      currentOwnerId: transfer.toEmployeeId,
    });

    await this.auditService.log(ctx, {
      action: 'APPROVE_TRANSFER',
      entityType: 'ASSET_TRANSFER',
      entityId: id,
      afterState: updated,
    });

    return updated;
  }

  async rejectTransfer(ctx: TenantContext, id: number) {
    const transfer = await this.transferRepo.getById(ctx, id);
    if (!transfer) {
      throw new NotFoundError('Transfer not found');
    }

    const updated = await this.transferRepo.update(ctx, id, {
      status: 'rejected',
      approvedBy: ctx.userId,
      approvalDate: new Date(),
    });

    return updated;
  }
}
