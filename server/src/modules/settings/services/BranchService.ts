import { v4 as uuidv4 } from 'uuid';
import { AuditService } from '../../audit/audit.service';
import { BranchRepository } from '../repositories/BranchRepository';
import type { TenantContext } from '../../../db/types';
import { ConflictError, NotFoundError, ValidationError } from '../../../common/errors/index';
import type { BranchCreate, BranchUpdate } from '@apponexthrms/shared/validation/settings.schemas';
import { assertMasterNotInUse } from '../utils/masterUsage';

export class BranchService {
  private branchRepo: BranchRepository;
  private auditService: AuditService;

  constructor() {
    this.branchRepo = new BranchRepository();
    this.auditService = new AuditService();
  }

  /**
   * Get all branches
   */
  async listBranches(ctx: TenantContext, options?: any) {
    return this.branchRepo.list(ctx, options);
  }

  /**
   * Get branch by ID
   */
  async getBranch(ctx: TenantContext, id: number | string) {
    const branch = await this.branchRepo.getById(ctx, id);
    if (!branch) {
      throw new NotFoundError('Branch not found');
    }
    return branch;
  }

  /**
   * Create new branch
   */
  async createBranch(ctx: TenantContext, data: BranchCreate) {
    // Check code uniqueness
    const isUnique = await this.branchRepo.isCodeUnique(ctx, data.code);
    if (!isUnique) {
      throw new ConflictError(`Branch code '${data.code}' already exists`);
    }

    const branch = await this.branchRepo.create(ctx, {
      uuid: uuidv4(),
      name: data.name,
      code: data.code,
      address_line1: data.addressLine1 || null,
      address_line2: data.addressLine2 || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
      postal_code: data.postalCode || null,
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      branch_head_id: data.branchHeadId || null,
      is_primary: data.isPrimary || false,
      status: data.status || 'active',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'BRANCH',
      entityId: branch.id,
      afterState: {
        name: branch.name,
        code: branch.code,
        status: branch.status,
      },
    });

    return branch;
  }

  /**
   * Update branch
   */
  async updateBranch(ctx: TenantContext, id: number | string, data: BranchUpdate) {
    const branch = await this.getBranch(ctx, id);

    // Check code uniqueness if code is being updated
    if (data.code && data.code !== branch.code) {
      const isUnique = await this.branchRepo.isCodeUnique(ctx, data.code, branch.id);
      if (!isUnique) {
        throw new ConflictError(`Branch code '${data.code}' already exists`);
      }
    }

    const updated = await this.branchRepo.update(ctx, id, {
      name: data.name || undefined,
      code: data.code || undefined,
      address_line1: data.addressLine1 !== undefined ? data.addressLine1 : undefined,
      address_line2: data.addressLine2 !== undefined ? data.addressLine2 : undefined,
      city: data.city !== undefined ? data.city : undefined,
      state: data.state !== undefined ? data.state : undefined,
      country: data.country !== undefined ? data.country : undefined,
      postal_code: data.postalCode !== undefined ? data.postalCode : undefined,
      phone: data.phone !== undefined ? data.phone : undefined,
      email: data.email !== undefined ? data.email : undefined,
      website: data.website !== undefined ? data.website : undefined,
      branch_head_id: data.branchHeadId !== undefined ? data.branchHeadId : undefined,
      is_primary: data.isPrimary !== undefined ? data.isPrimary : undefined,
      status: data.status || undefined,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'BRANCH',
      entityId: branch.id,
      beforeState: { name: branch.name, code: branch.code },
      afterState: { name: updated.name, code: updated.code },
    });

    return updated;
  }

  /**
   * Delete branch (soft delete)
   */
  async deleteBranch(ctx: TenantContext, id: number | string) {
    const branch = await this.getBranch(ctx, id);

    await assertMasterNotInUse(ctx.organizationId, id, 'branch', [
      { table: 'employees', column: 'current_branch_id', label: 'employee(s)' },
    ]);

    await this.branchRepo.delete(ctx, id);

    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'BRANCH',
      entityId: branch.id,
      beforeState: { name: branch.name, code: branch.code },
    });
  }

  /**
   * Restore branch
   */
  async restoreBranch(ctx: TenantContext, id: number | string) {
    const branch = await this.branchRepo.restore(ctx, id);

    await this.auditService.log(ctx, {
      action: 'RESTORE',
      entityType: 'BRANCH',
      entityId: branch.id,
      afterState: { name: branch.name, code: branch.code },
    });

    return branch;
  }
}
