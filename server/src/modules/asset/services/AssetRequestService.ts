import { AssetRequestRepository } from '../repositories/AssetRequestRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';

export class AssetRequestService {
  private requestRepo: AssetRequestRepository;
  private auditService: AuditService;

  constructor() {
    this.requestRepo = new AssetRequestRepository();
    this.auditService = new AuditService();
  }

  async list(ctx: TenantContext, options = {}) {
    return this.requestRepo.list(ctx, options);
  }

  async getById(ctx: TenantContext, id: number) {
    const request = await this.requestRepo.getById(ctx, id);
    if (!request) {
      throw new NotFoundError('Request not found');
    }
    return request;
  }

  async create(ctx: TenantContext, data: any) {
    const request = await this.requestRepo.create(ctx, {
      ...data,
      status: 'pending',
      requestedBy: ctx.userId,
    });

    await this.auditService.log(ctx, {
      action: 'CREATE_REQUEST',
      entityType: 'ASSET_REQUEST',
      entityId: request.id,
      afterState: request,
    });

    return request;
  }

  async approve(ctx: TenantContext, id: number) {
    const request = await this.getById(ctx, id);

    const updated = await this.requestRepo.update(ctx, id, {
      status: 'approved',
      approvedBy: ctx.userId,
      approvalDate: new Date(),
    });

    await this.auditService.log(ctx, {
      action: 'APPROVE_REQUEST',
      entityType: 'ASSET_REQUEST',
      entityId: id,
      afterState: updated,
    });

    return updated;
  }

  async reject(ctx: TenantContext, id: number) {
    const request = await this.getById(ctx, id);

    const updated = await this.requestRepo.update(ctx, id, {
      status: 'rejected',
      approvedBy: ctx.userId,
      approvalDate: new Date(),
    });

    return updated;
  }

  async fulfill(ctx: TenantContext, id: number) {
    const request = await this.getById(ctx, id);

    const updated = await this.requestRepo.update(ctx, id, {
      status: 'fulfilled',
      fulfilledBy: ctx.userId,
      fulfilledDate: new Date(),
    });

    await this.auditService.log(ctx, {
      action: 'FULFILL_REQUEST',
      entityType: 'ASSET_REQUEST',
      entityId: id,
      afterState: updated,
    });

    return updated;
  }

  async getPending(ctx: TenantContext) {
    return this.requestRepo.getPending(ctx);
  }

  async getByEmployee(ctx: TenantContext, employeeId: number) {
    return this.requestRepo.getByEmployee(ctx, employeeId);
  }
}
