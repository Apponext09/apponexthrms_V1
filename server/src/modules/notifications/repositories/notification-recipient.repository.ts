import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface NotificationRecipient {
  id: number;
  uuid: string;
  organization_id: number;
  notification_id: number;
  recipient_id: number;
  recipient_type: 'to' | 'cc' | 'bcc';
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  sent_at?: Date;
  delivered_at?: Date;
  read_at?: Date;
  opened_at?: Date;
  clicked_at?: Date;
  error_message?: string;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export class NotificationRecipientRepository extends BaseRepository<NotificationRecipient> {
  constructor() {
    super('notification_recipients');
  }

  /**
   * Get recipients by notification ID
   */
  async getByNotificationId(ctx: TenantContext, notificationId: number): Promise<NotificationRecipient[]> {
    return this.query(ctx).where('notification_id', notificationId);
  }

  /**
   * Get recipient status
   */
  async getRecipientStatus(
    ctx: TenantContext,
    notificationId: number,
    recipientId: number
  ): Promise<NotificationRecipient | null> {
    return this.query(ctx)
      .where('notification_id', notificationId)
      .where('recipient_id', recipientId)
      .first() as Promise<NotificationRecipient | null>;
  }

  /**
   * Update recipient status
   */
  async updateStatus(
    ctx: TenantContext,
    notificationId: number,
    recipientId: number,
    status: string,
    updates: any = {}
  ): Promise<NotificationRecipient> {
    const current = await this.getRecipientStatus(ctx, notificationId, recipientId);
    if (!current) {
      throw new Error(`Recipient not found for notification ${notificationId}`);
    }

    return this.update(ctx, current.id, { status, ...updates } as any);
  }

  /**
   * Get delivery stats for notification
   */
  async getDeliveryStats(ctx: TenantContext, notificationId: number): Promise<any> {
    return this.db('notification_recipients')
      .where('organization_id', ctx.organizationId)
      .where('notification_id', notificationId)
      .select('status')
      .groupBy('status')
      .count('* as count')
      .then((stats: any[]) => {
        const result: Record<string, number> = {
          queued: 0,
          sent: 0,
          delivered: 0,
          failed: 0,
        };

        stats.forEach((stat: any) => {
          result[stat.status] = Number(stat.count);
        });

        return result;
      });
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return [];
  }
}
