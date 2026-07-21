import { logger } from '@/common/lib/logger';
import { AuditRepository } from './audit.repository';
import type { TenantContext } from '../../db/types';
import type { AuditLogInput } from './audit.types';

/**
 * AuditService: generic audit logging used by all modules
 * Called on every mutation (CREATE, UPDATE, DELETE, APPROVE, REJECT, etc.)
 */
export class AuditService {
  private repo: AuditRepository;

  constructor() {
    this.repo = new AuditRepository();
  }

  /**
   * Log an action
   */
  async log(ctx: TenantContext, input: AuditLogInput, ip: string = '127.0.0.1', userAgent: string = 'unknown'): Promise<void> {
    try {
      await this.repo.createLog(ctx, {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        beforeState: input.beforeState,
        afterState: input.afterState,
        ipAddress: ip,
        userAgent,
      });
    } catch (error) {
      // Don't fail the operation if audit logging fails
      logger.warn('Failed to log audit entry', {
        error: error instanceof Error ? error.message : 'unknown',
        action: input.action,
        entityType: input.entityType,
      });
    }
  }

  /**
   * Get audit trail for entity
   */
  async getEntityHistory(
    ctx: TenantContext,
    entityType: string,
    entityId: string | number,
    limit?: number
  ) {
    return this.repo.getForEntity(ctx, entityType, entityId, limit);
  }

  /**
   * Get actions by user
   */
  async getUserActions(ctx: TenantContext, userId: number, limit?: number) {
    return this.repo.getForUser(ctx, userId, limit);
  }

  /**
   * Get actions by type
   */
  async getActionLog(ctx: TenantContext, action: string, limit?: number) {
    return this.repo.getByAction(ctx, action, limit);
  }
}


