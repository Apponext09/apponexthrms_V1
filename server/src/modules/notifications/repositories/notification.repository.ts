import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface Notification {
  id: number;
  uuid: string;
  organization_id: number;
  event_code: string;
  template_id: number;
  recipient_id: number;
  channels: string[]; // JSON array
  subject_line?: string;
  body_text: string;
  variables: Record<string, any>; // JSON object
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduled_at?: Date;
  sent_at?: Date;
  read_at?: Date;
  read_by_user_id?: number;
  error_message?: string;
  retry_count: number;
  next_retry_at?: Date;
  related_entity_type?: string;
  related_entity_id?: number;
  created_by: number;
  updated_by: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export class NotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super('notifications');
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    ctx: TenantContext,
    userId: number,
    options: any = {}
  ): Promise<{ items: Notification[]; meta: any }> {
    const user = await this.db('users').where('id', userId).first().catch(() => null);
    const employeeId = user?.employee_id;
    let userRoles: string[] = [];
    if (typeof user?.roles === 'string') {
      try { userRoles = JSON.parse(user.roles); } catch { userRoles = [user.roles]; }
    } else if (Array.isArray(user?.roles)) {
      userRoles = user.roles;
    }
    const isSuperOrAdmin = userRoles.includes('organization_admin') || 
                           userRoles.includes('super_admin') || 
                           userRoles.includes('hr_admin') ||
                           userRoles.includes('hr') ||
                           userRoles.includes('hr_manager');

    const page = Number(options?.page) || 1;
    const pageSize = Number(options?.pageSize) || 20;

    let q = this.query(ctx)
      .whereNull('notifications.deleted_at')
      .where((builder) => {
        builder.where('notifications.recipient_id', userId);
        if (employeeId) {
          builder.orWhere('notifications.recipient_id', employeeId);
        }
        builder.orWhereNull('notifications.recipient_id');
        if (isSuperOrAdmin) {
          builder.orWhere('notifications.created_by', userId);
        }
      });

    if (options?.filters?.status) {
      q = q.where('notifications.status', options.filters.status);
    }

    const countRes = await q.clone().count('* as count').first();
    const total = Number((countRes as any)?.count || 0);

    const items = await q
      .orderBy('notifications.created_at', 'desc')
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        hasMore: page * pageSize < total,
        totalPages: Math.ceil(total / pageSize),
      }
    };
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(ctx: TenantContext, userId: number): Promise<number> {
    const user = await this.db('users').where('id', userId).first().catch(() => null);
    const employeeId = user?.employee_id;
    let userRoles: string[] = [];
    if (typeof user?.roles === 'string') {
      try { userRoles = JSON.parse(user.roles); } catch { userRoles = [user.roles]; }
    } else if (Array.isArray(user?.roles)) {
      userRoles = user.roles;
    }
    const isSuperOrAdmin = userRoles.includes('organization_admin') || 
                           userRoles.includes('super_admin') || 
                           userRoles.includes('hr_admin') ||
                           userRoles.includes('hr') ||
                           userRoles.includes('hr_manager');

    const result = await this.query(ctx)
      .whereNull('notifications.deleted_at')
      .whereNull('notifications.read_at')
      .where((builder) => {
        builder.where('notifications.recipient_id', userId);
        if (employeeId) {
          builder.orWhere('notifications.recipient_id', employeeId);
        }
        builder.orWhereNull('notifications.recipient_id');
        if (isSuperOrAdmin) {
          builder.orWhere('notifications.created_by', userId);
        }
      })
      .count('* as count')
      .first();

    return Number((result as any)?.count || 0);
  }

  /**
   * Get notifications by event code
   */
  async getByEventCode(ctx: TenantContext, eventCode: string): Promise<Notification[]> {
    return this.query(ctx).where('event_code', eventCode).orderBy('created_at', 'desc');
  }

  /**
   * Get queued notifications for delivery
   */
  async getQueuedNotifications(ctx: TenantContext, limit: number = 100): Promise<Notification[]> {
    return this.query(ctx)
      .where('status', 'queued')
      .orWhere((q) => {
        q.where('status', 'failed')
          .whereNotNull('next_retry_at')
          .where('next_retry_at', '<=', new Date());
      })
      .orderBy('priority', 'desc')
      .orderBy('created_at', 'asc')
      .limit(limit);
  }

  /**
   * Get notifications by related entity
   */
  async getByRelatedEntity(
    ctx: TenantContext,
    entityType: string,
    entityId: number
  ): Promise<Notification[]> {
    return this.query(ctx)
      .where('related_entity_type', entityType)
      .where('related_entity_id', entityId)
      .orderBy('created_at', 'desc');
  }

  /**
   * Mark as read
   */
  async markAsRead(ctx: TenantContext, notificationId: number, userId: number): Promise<Notification> {
    return this.update(ctx, notificationId, {
      read_at: new Date(),
      read_by_user_id: userId,
      status: 'delivered',
    } as any);
  }

  /**
   * Mark all as read for user
   */
  async markAllAsRead(ctx: TenantContext, userId: number): Promise<number> {
    return this.updateWhere(
      ctx,
      { recipient_id: userId },
      { read_at: new Date(), status: 'delivered' } as any
    );
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return ['subject_line', 'body_text', 'event_code'];
  }
}
