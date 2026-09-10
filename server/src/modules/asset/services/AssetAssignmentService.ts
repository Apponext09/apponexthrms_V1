import { AssetAssignmentRepository } from '../repositories/AssetAssignmentRepository';
import { AssetRepository } from '../repositories/AssetRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';

export class AssetAssignmentService {
  private assignmentRepo: AssetAssignmentRepository;
  private assetRepo: AssetRepository;
  private auditService: AuditService;

  constructor() {
    this.assignmentRepo = new AssetAssignmentRepository();
    this.assetRepo = new AssetRepository();
    this.auditService = new AuditService();
  }

  async list(ctx: TenantContext, options = {}) {
    return this.assignmentRepo.list(ctx, options);
  }

  async getById(ctx: TenantContext, id: number) {
    const assignment = await this.assignmentRepo.getById(ctx, id);
    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }
    return assignment;
  }

  async assign(ctx: TenantContext, data: any) {
    // Validate asset exists and is available
    const asset = await this.assetRepo.getById(ctx, data.assetId);
    if (!asset) {
      throw new NotFoundError('Asset not found');
    }
    if (asset.status !== 'available') {
      throw new ValidationError(`Asset is ${asset.status}, cannot assign`);
    }

    // Check for existing active assignment
    const existing = await this.assignmentRepo.getByAsset(ctx, data.assetId);
    if (existing) {
      throw new ValidationError('Asset is already assigned');
    }

    const assignment = await this.assignmentRepo.create(ctx, {
      ...data,
      status: 'active',
      assignedBy: ctx.userId,
    });

    // Update asset status
    await this.assetRepo.update(ctx, data.assetId, {
      status: 'assigned',
      currentOwnerId: data.employeeId,
    });

    await this.auditService.log(ctx, {
      action: 'ASSIGN',
      entityType: 'ASSET_ASSIGNMENT',
      entityId: assignment.id,
      afterState: assignment,
    });

    return assignment;
  }

  async getActiveAssignments(ctx: TenantContext, employeeId: number) {
    return this.assignmentRepo.getActiveAssignments(ctx, employeeId);
  }
}
