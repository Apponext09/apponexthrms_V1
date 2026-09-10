import { v4 as uuidv4 } from 'uuid';
import { AuditService } from '../../audit/audit.service';
import type { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';
import { ConflictError, NotFoundError } from '../../../common/errors/index';

/**
 * Generic service for simple CRUD operations on settings entities
 * Handles code uniqueness checks, audit logging, and soft deletes
 */
export class GenericSettingsService {
  private auditService: AuditService;

  constructor(private repo: BaseRepository<any>, private entityType: string, private codeField: string = 'code') {
    this.auditService = new AuditService();
  }

  async list(ctx: TenantContext, options?: any) {
    return this.repo.list(ctx, options);
  }

  async getById(ctx: TenantContext, id: number | string) {
    const item = await this.repo.getById(ctx, id);
    if (!item) throw new NotFoundError(`${this.entityType} not found`);
    return item;
  }

  async create(ctx: TenantContext, data: any, auditDetails?: any) {
    // Check code uniqueness if applicable
    if (this.codeField && data[this.codeField]) {
      const existing = await this.repo.getByFields(ctx, { [this.codeField]: data[this.codeField] });
      if (existing) throw new ConflictError(`${this.entityType} code '${data[this.codeField]}' already exists`);
    }

    const item = await this.repo.create(ctx, {
      ...data,
      uuid: data.uuid || uuidv4(),
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: this.entityType,
      entityId: item.id,
      afterState: auditDetails || { id: item.id },
    });

    return item;
  }

  async update(ctx: TenantContext, id: number | string, data: any, auditDetails?: any) {
    const existing = await this.getById(ctx, id);

    // Check code uniqueness if code is being updated
    if (this.codeField && data[this.codeField] && data[this.codeField] !== existing[this.codeField]) {
      const conflict = await this.repo.getByFields(ctx, { [this.codeField]: data[this.codeField] });
      if (conflict) throw new ConflictError(`${this.entityType} code already exists`);
    }

    const updated = await this.repo.update(ctx, id, {
      ...data,
      updated_by: ctx.userId,
    });

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: this.entityType,
      entityId: existing.id,
      beforeState: auditDetails?.before || { id: existing.id },
      afterState: auditDetails?.after || { id: updated.id },
    });

    return updated;
  }

  async delete(ctx: TenantContext, id: number | string, auditDetails?: any) {
    const existing = await this.getById(ctx, id);
    await this.repo.delete(ctx, id);
    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: this.entityType,
      entityId: existing.id,
      beforeState: auditDetails || { id: existing.id },
    });
  }

  async restore(ctx: TenantContext, id: number | string, auditDetails?: any) {
    const item = await this.repo.restore(ctx, id);
    await this.auditService.log(ctx, {
      action: 'RESTORE',
      entityType: this.entityType,
      entityId: item.id,
      afterState: auditDetails || { id: item.id },
    });
    return item;
  }
}
