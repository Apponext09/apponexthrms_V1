import { BaseRepository } from '../../../db/BaseRepository';
import type { AuthSession } from '@apponexthrms/shared';
import type { TenantContext } from '../../../db/types';

export class SessionRepository extends BaseRepository<AuthSession> {
  constructor() {
    super('auth_sessions');
  }

  /**
   * Create session without updated_at (table doesn't have this column)
   */
  async create(ctx: TenantContext, data: Partial<AuthSession>): Promise<AuthSession> {
    const [id] = await this.query(ctx)
      .insert({
        ...data,
        organization_id: ctx.organizationId,
        created_at: new Date(),
        // Note: auth_sessions table doesn't have updated_at column
      });

    const created = await this.getById(ctx, id);
    if (!created) {
      throw new Error('Failed to create auth session');
    }

    return created;
  }

  /**
   * Get active session by UUID (with tenant isolation)
   * SECURITY: Must verify tenant context to prevent cross-tenant access
   */
  async getActiveByUuid(uuid: string, ctx?: TenantContext): Promise<AuthSession | null> {
    const now = new Date();

    let query = this.db<AuthSession>('auth_sessions')
      .where('uuid', uuid)
      .whereNull('revoked_at');

    // Add tenant isolation if ctx provided
    if (ctx) {
      query = query.where('organization_id', ctx.organizationId);
    }

    // Check if not expired
    const result = await query.first() as any;
    if (!result) {
      return null;
    }

    // Verify expiration
    if (result.expires_at && new Date(result.expires_at) <= now) {
      return null;
    }

    return result as AuthSession;
  }

  /**
   * Get all active sessions for user
   */
  async getActiveForUser(ctx: TenantContext): Promise<AuthSession[]> {
    const now = new Date();

    return this.query(ctx)
      .where('user_id', ctx.userId)
      .where('revoked_at', null)
      .where('expires_at', '>', now.toISOString())
      .orderBy('last_active_at', 'desc') as Promise<AuthSession[]>;
  }

  /**
   * Revoke session
   */
  async revoke(
    ctx: TenantContext,
    sessionUuid: string,
    reason: string = 'user_logout'
  ): Promise<void> {
    await this.query(ctx)
      .where('uuid', sessionUuid)
      .update({
        revoked_at: new Date(),
        revoked_reason: reason,
      });
  }

  /**
   * Revoke all user sessions
   */
  async revokeAllForUser(ctx: TenantContext, reason: string = 'force_logout'): Promise<number> {
    return this.query(ctx)
      .where('user_id', ctx.userId)
      .where('revoked_at', null)
      .update({
        revoked_at: new Date(),
        revoked_reason: reason,
      });
  }

  /**
   * Update last active time
   */
  async updateLastActive(ctx: TenantContext, sessionUuid: string): Promise<void> {
    await this.query(ctx)
      .where('uuid', sessionUuid)
      .update({
        last_active_at: new Date(),
      });
  }

  /**
   * Clean up expired sessions (called periodically)
   */
  async cleanupExpired(): Promise<number> {
    const now = new Date();

    return this.db('auth_sessions')
      .where('expires_at', '<', now.toISOString())
      .where('revoked_at', 'is', null)
      .update({
        revoked_at: now,
        revoked_reason: 'expired',
      });
  }

  /**
   * Get searchable fields
   */
  protected getSearchableFields(): string[] {
    return ['device_name', 'device_id'];
  }
}
