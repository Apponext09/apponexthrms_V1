import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface NotificationLog {
  id: number;
  uuid: string;
  organization_id: number;
  notification_id: number;
  channel: 'email' | 'sms' | 'whatsapp' | 'push' | 'inapp' | 'webhook';
  recipient_address: string;
  status: 'sent' | 'delivered' | 'failed' | 'bounced';
  attempt_number: number;
  provider_response_code?: number;
  provider_response_body?: string;
  timestamp: Date;
  execution_time_ms?: number;
}

export class NotificationLogRepository extends BaseRepository<NotificationLog> {
  constructor() {
    super('notification_logs');
  }

  /**
   * Get logs for notification
   */
  async getByNotificationId(ctx: TenantContext, notificationId: number): Promise<NotificationLog[]> {
    return this.query(ctx).where('notification_id', notificationId).orderBy('timestamp', 'desc');
  }

  /**
   * Get logs by channel
   */
  async getByChannel(ctx: TenantContext, channel: string, limit: number = 100): Promise<NotificationLog[]> {
    return this.query(ctx)
      .where('channel', channel)
      .orderBy('timestamp', 'desc')
      .limit(limit);
  }

  /**
   * Get delivery success rate
   */
  async getSuccessRate(ctx: TenantContext, startDate?: Date, endDate?: Date): Promise<number> {
    let query = this.query(ctx);

    if (startDate) {
      query = query.where('timestamp', '>=', startDate);
    }

    if (endDate) {
      query = query.where('timestamp', '<=', endDate);
    }

    const totalResult = await query.clone().count('* as count').first();
    const successResult = await query.clone().where('status', 'delivered').count('* as count').first();

    const total = (totalResult as any)?.count || 0;
    const success = (successResult as any)?.count || 0;

    return total === 0 ? 0 : (success / total) * 100;
  }

  /**
   * Get channel statistics
   */
  async getChannelStats(ctx: TenantContext, startDate?: Date, endDate?: Date): Promise<any> {
    let query = this.query(ctx);

    if (startDate) {
      query = query.where('timestamp', '>=', startDate);
    }

    if (endDate) {
      query = query.where('timestamp', '<=', endDate);
    }

    return query
      .select('channel', 'status')
      .groupBy('channel', 'status')
      .count('* as count')
      .then((stats: any[]) => {
        const result: Record<string, Record<string, number>> = {};

        stats.forEach((stat: any) => {
          if (!result[stat.channel]) {
            result[stat.channel] = { sent: 0, delivered: 0, failed: 0, bounced: 0 };
          }

          result[stat.channel][stat.status] = Number(stat.count);
        });

        return result;
      });
  }

  /**
   * Get searchable fields - empty for log table
   */
  protected getSearchableFields(): string[] {
    return [];
  }
}
