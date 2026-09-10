import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface NotificationQueueItem {
  id: number;
  uuid: string;
  organization_id: number;
  notification_id: number;
  channel: 'email' | 'sms' | 'whatsapp' | 'push' | 'inapp' | 'webhook';
  recipient_email?: string;
  recipient_phone?: string;
  recipient_push_token?: string;
  recipient_webhook_url?: string;
  status: 'pending' | 'processing' | 'delivered' | 'failed';
  priority: number;
  attempt_count: number;
  last_attempted_at?: Date;
  next_attempt_at?: Date;
  error_message?: string;
  response_code?: number;
  response_body?: string;
  created_at: Date;
  updated_at: Date;
}

export class NotificationQueueRepository extends BaseRepository<NotificationQueueItem> {
  constructor() {
    super('notification_queue');
  }

  /**
   * Get pending queue items for processing
   */
  async getPendingItems(ctx: TenantContext, limit: number = 100): Promise<NotificationQueueItem[]> {
    return this.db('notification_queue')
      .where('organization_id', ctx.organizationId)
      .where((q) => {
        q.where('status', 'pending').orWhere((q2) => {
          q2.where('status', 'failed')
            .whereNotNull('next_attempt_at')
            .where('next_attempt_at', '<=', new Date());
        });
      })
      .orderBy('priority', 'desc')
      .orderBy('created_at', 'asc')
      .limit(limit);
  }

  /**
   * Get queue items by notification
   */
  async getByNotificationId(
    ctx: TenantContext,
    notificationId: number
  ): Promise<NotificationQueueItem[]> {
    return this.query(ctx).where('notification_id', notificationId);
  }

  /**
   * Get queue items by channel
   */
  async getByChannel(ctx: TenantContext, channel: string): Promise<NotificationQueueItem[]> {
    return this.query(ctx).where('channel', channel).where('status', 'pending');
  }

  /**
   * Update queue item status
   */
  async updateItemStatus(
    ctx: TenantContext,
    queueItemId: number,
    status: string,
    updates: any = {}
  ): Promise<NotificationQueueItem> {
    return this.update(ctx, queueItemId, { status, ...updates } as any);
  }

  /**
   * Mark as processing
   */
  async markProcessing(ctx: TenantContext, queueItemId: number): Promise<NotificationQueueItem> {
    return this.updateItemStatus(ctx, queueItemId, 'processing', {
      last_attempted_at: new Date(),
    });
  }

  /**
   * Mark as delivered
   */
  async markDelivered(
    ctx: TenantContext,
    queueItemId: number,
    responseCode?: number,
    responseBody?: string
  ): Promise<NotificationQueueItem> {
    return this.updateItemStatus(ctx, queueItemId, 'delivered', {
      response_code: responseCode,
      response_body: responseBody,
    });
  }

  /**
   * Mark as failed and schedule retry
   */
  async markFailedWithRetry(
    ctx: TenantContext,
    queueItemId: number,
    errorMessage: string,
    retryIntervalMinutes: number,
    maxRetries: number
  ): Promise<NotificationQueueItem> {
    const item = await this.getById(ctx, queueItemId);
    if (!item) {
      throw new Error('Queue item not found');
    }

    const newAttemptCount = item.attempt_count + 1;
    const shouldRetry = newAttemptCount < maxRetries;

    const nextAttemptAt = shouldRetry
      ? new Date(Date.now() + retryIntervalMinutes * 60 * 1000)
      : null;

    return this.updateItemStatus(ctx, queueItemId, shouldRetry ? 'pending' : 'failed', {
      attempt_count: newAttemptCount,
      error_message: errorMessage,
      next_attempt_at: nextAttemptAt,
    });
  }

  /**
   * Get queue stats
   */
  async getQueueStats(ctx: TenantContext): Promise<any> {
    const stats = await this.db('notification_queue')
      .where('organization_id', ctx.organizationId)
      .select('status', 'channel')
      .groupBy('status', 'channel')
      .count('* as count');

    return stats;
  }

  /**
   * Get searchable fields - empty for queue table
   */
  protected getSearchableFields(): string[] {
    return [];
  }
}
