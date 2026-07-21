import { BaseRepository } from '../../db/BaseRepository';
import type { AuditLog } from '@apponexthrms/shared';
import type { TenantContext } from '../../db/types';

export class AuditRepository extends BaseRepository<AuditLog> {
  constructor() {
    super('audit_logs');
  }

  /**
   * Override create to exclude updated_at (audit_logs is append-only, immutable)
   */
  async create(ctx: TenantContext, data: Partial<AuditLog>): Promise<AuditLog> {
    const { getKnex } = await import('../../db/knex');
    const db = getKnex();

    const [id] = await db('audit_logs')
      .where('organization_id', ctx.organizationId)
      .insert({
        ...data,
        organization_id: ctx.organizationId,
        created_at: new Date(),
      });

    const created = await this.getById(ctx, id);
    if (!created) {
      throw new Error(`Failed to create audit log`);
    }

    return created;
  }

  /**
   * Create audit log entry (audit_logs is append-only)
   */
  async createLog(
    ctx: TenantContext,
    data: {
      action: string;
      entityType: string;
      entityId: string | number;
      beforeState?: Record<string, unknown>;
      afterState?: Record<string, unknown>;
      ipAddress: string;
      userAgent: string;
    }
  ): Promise<AuditLog> {
    const log = await this.create(ctx, {
      action: data.action,
      entity_type: data.entityType,
      entity_id: data.entityId,
      before_state: data.beforeState,
      after_state: data.afterState,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
      actor_user_id: ctx.userId,
    } as any);

    return log;
  }

  /**
   * Get audit logs for entity
   */
  async getForEntity(
    ctx: TenantContext,
    entityType: string,
    entityId: string | number,
    limit: number = 50
  ) {
    return this.query(ctx)
      .where('entity_type', entityType)
      .where('entity_id', entityId)
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  /**
   * Get audit logs for user action
   */
  async getForUser(ctx: TenantContext, userId: number, limit: number = 100) {
    return this.query(ctx)
      .where('actor_user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  /**
   * Get audit logs by action
   */
  async getByAction(ctx: TenantContext, action: string, limit: number = 100) {
    return this.query(ctx)
      .where('action', action)
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  /**
   * Get searchable fields
   */
  protected getSearchableFields(): string[] {
    return ['action', 'entity_type'];
  }
}
