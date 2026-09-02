import { getKnex } from '../../../db/knex';
import { logger } from '../../../common/lib/logger';
import type { TenantContext } from '../../../db/types';

/**
 * Notification type definitions
 */
export type NotificationType =
  | 'leave_approved'
  | 'leave_rejected'
  | 'leave_requested'
  | 'attendance_reminder'
  | 'payroll_processed'
  | 'asset_assigned'
  | 'task_assigned'
  | 'comment_mentioned'
  | 'system_alert'
  | 'approval_required'
  | 'shift_changed'
  | 'holiday_reminder';

export type NotificationChannel = 'email' | 'in_app' | 'sms' | 'push';

export interface NotificationPreference {
  type: NotificationType;
  enabled: boolean;
  channels: NotificationChannel[];
  frequency?: 'immediate' | 'daily' | 'weekly' | 'never';
}

/**
 * Service to manage and enforce notification preferences
 */
export class NotificationPreferenceService {
  private db = getKnex();

  /**
   * Get all notification preferences for a user
   */
  async getUserPreferences(ctx: TenantContext): Promise<Record<NotificationType, NotificationPreference>> {
    const preferences = await this.db('notification_preferences')
      .where('user_id', ctx.userId)
      .where('organization_id', ctx.organizationId);

    return this.normalizePreferences(preferences);
  }

  /**
   * Get preference for a specific notification type
   */
  async getPreferenceForType(
    ctx: TenantContext,
    type: NotificationType
  ): Promise<NotificationPreference> {
    const pref = await this.db('notification_preferences')
      .where('user_id', ctx.userId)
      .where('organization_id', ctx.organizationId)
      .where('type', type)
      .first();

    if (!pref) {
      // Return default preference if not found
      return this.getDefaultPreference(type);
    }

    return {
      type,
      enabled: pref.enabled ?? true,
      channels: JSON.parse(pref.channels || '["in_app", "email"]'),
      frequency: pref.frequency || 'immediate',
    };
  }

  /**
   * Update preference for a notification type
   */
  async updatePreference(
    ctx: TenantContext,
    type: NotificationType,
    preference: Partial<NotificationPreference>
  ): Promise<NotificationPreference> {
    const existing = await this.db('notification_preferences')
      .where('user_id', ctx.userId)
      .where('organization_id', ctx.organizationId)
      .where('type', type)
      .first();

    const updateData = {
      enabled: preference.enabled ?? true,
      channels: JSON.stringify(preference.channels || ['in_app', 'email']),
      frequency: preference.frequency || 'immediate',
      updated_at: new Date(),
    };

    if (existing) {
      // Update
      await this.db('notification_preferences')
        .where('user_id', ctx.userId)
        .where('organization_id', ctx.organizationId)
        .where('type', type)
        .update(updateData);

      logger.debug('[NotifPrefs] Preference updated', {
        userId: ctx.userId,
        type,
        enabled: updateData.enabled,
      });
    } else {
      // Insert
      await this.db('notification_preferences').insert({
        user_id: ctx.userId,
        organization_id: ctx.organizationId,
        type,
        ...updateData,
        created_at: new Date(),
      });

      logger.debug('[NotifPrefs] Preference created', {
        userId: ctx.userId,
        type,
        enabled: updateData.enabled,
      });
    }

    return this.getPreferenceForType(ctx, type);
  }

  /**
   * Check if notification should be sent based on preferences
   */
  async shouldSendNotification(
    ctx: TenantContext,
    type: NotificationType,
    requestedChannel: NotificationChannel = 'in_app'
  ): Promise<{
    shouldSend: boolean;
    channels: NotificationChannel[];
    reason?: string;
  }> {
    const preference = await this.getPreferenceForType(ctx, type);

    // Check if notification type is disabled globally
    if (!preference.enabled) {
      logger.debug('[NotifPrefs] Notification skipped: disabled', {
        userId: ctx.userId,
        type,
      });
      return {
        shouldSend: false,
        channels: [],
        reason: 'Notification type is disabled',
      };
    }

    // Check if preferred channel is enabled
    const validChannels = preference.channels.filter((c) => c === requestedChannel);
    if (validChannels.length === 0) {
      logger.debug('[NotifPrefs] Notification skipped: channel disabled', {
        userId: ctx.userId,
        type,
        requestedChannel,
        enabledChannels: preference.channels,
      });
      return {
        shouldSend: false,
        channels: [],
        reason: `Channel ${requestedChannel} is not enabled for this notification type`,
      };
    }

    logger.debug('[NotifPrefs] Notification allowed', {
      userId: ctx.userId,
      type,
      channels: validChannels,
    });

    return {
      shouldSend: true,
      channels: validChannels,
    };
  }

  /**
   * Get default preferences for a new user
   */
  getDefaultPreferences(): Record<NotificationType, NotificationPreference> {
    const types: NotificationType[] = [
      'leave_approved',
      'leave_rejected',
      'leave_requested',
      'attendance_reminder',
      'payroll_processed',
      'asset_assigned',
      'task_assigned',
      'comment_mentioned',
      'system_alert',
      'approval_required',
      'shift_changed',
      'holiday_reminder',
    ];

    const defaults: Record<NotificationType, NotificationPreference> = {} as any;

    types.forEach((type) => {
      defaults[type] = this.getDefaultPreference(type);
    });

    return defaults;
  }

  /**
   * Initialize default preferences for a new user
   */
  async initializeUserPreferences(ctx: TenantContext): Promise<void> {
    const defaults = this.getDefaultPreferences();
    const now = new Date();

    const prefs = Object.entries(defaults).map(([type, pref]) => ({
      user_id: ctx.userId,
      organization_id: ctx.organizationId,
      type,
      enabled: pref.enabled,
      channels: JSON.stringify(pref.channels),
      frequency: pref.frequency,
      created_at: now,
      updated_at: now,
    }));

    await this.db('notification_preferences').insert(prefs);

    logger.info('[NotifPrefs] User preferences initialized', {
      userId: ctx.userId,
      orgId: ctx.organizationId,
      count: prefs.length,
    });
  }

  /**
   * Get notification log for audit purposes
   */
  async getNotificationLog(
    ctx: TenantContext,
    type?: NotificationType,
    limit: number = 100
  ): Promise<any[]> {
    let query = this.db('notification_logs')
      .where('user_id', ctx.userId)
      .where('organization_id', ctx.organizationId);

    if (type) {
      query = query.where('type', type);
    }

    return query.orderBy('sent_at', 'desc').limit(limit);
  }

  /**
   * Log notification send event
   */
  async logNotificationSent(
    ctx: TenantContext,
    type: NotificationType,
    channels: NotificationChannel[],
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.db('notification_logs').insert({
      user_id: ctx.userId,
      organization_id: ctx.organizationId,
      type,
      channels: JSON.stringify(channels),
      metadata: metadata ? JSON.stringify(metadata) : null,
      sent_at: new Date(),
    });
  }

  /**
   * Get notification statistics for user
   */
  async getNotificationStats(ctx: TenantContext): Promise<{
    totalByType: Record<string, number>;
    totalByChannel: Record<string, number>;
    lastSentAt: Date | null;
  }> {
    const logs = await this.db('notification_logs')
      .where('user_id', ctx.userId)
      .where('organization_id', ctx.organizationId);

    const stats = {
      totalByType: {} as Record<string, number>,
      totalByChannel: {} as Record<string, number>,
      lastSentAt: null as Date | null,
    };

    for (const log of logs) {
      // Count by type
      stats.totalByType[log.type] = (stats.totalByType[log.type] || 0) + 1;

      // Count by channel
      const channels: string[] = JSON.parse(log.channels || '[]');
      for (const channel of channels) {
        stats.totalByChannel[channel] = (stats.totalByChannel[channel] || 0) + 1;
      }

      // Track latest
      if (!stats.lastSentAt || new Date(log.sent_at) > stats.lastSentAt) {
        stats.lastSentAt = new Date(log.sent_at);
      }
    }

    return stats;
  }

  /**
   * Private helper to normalize preferences from DB format
   */
  private normalizePreferences(
    dbPrefs: any[]
  ): Record<NotificationType, NotificationPreference> {
    const normalized: Record<NotificationType, NotificationPreference> = {} as any;

    for (const pref of dbPrefs) {
      normalized[pref.type] = {
        type: pref.type,
        enabled: pref.enabled ?? true,
        channels: JSON.parse(pref.channels || '["in_app", "email"]'),
        frequency: pref.frequency || 'immediate',
      };
    }

    return normalized;
  }

  /**
   * Get default preference for a specific type
   */
  private getDefaultPreference(type: NotificationType): NotificationPreference {
    const defaults: Record<NotificationType, NotificationPreference> = {
      leave_approved: {
        type,
        enabled: true,
        channels: ['in_app', 'email'],
        frequency: 'immediate',
      },
      leave_rejected: {
        type,
        enabled: true,
        channels: ['in_app', 'email'],
        frequency: 'immediate',
      },
      leave_requested: {
        type,
        enabled: true,
        channels: ['in_app', 'email'],
        frequency: 'immediate',
      },
      attendance_reminder: {
        type,
        enabled: true,
        channels: ['in_app'],
        frequency: 'daily',
      },
      payroll_processed: {
        type,
        enabled: true,
        channels: ['in_app', 'email'],
        frequency: 'immediate',
      },
      asset_assigned: {
        type,
        enabled: true,
        channels: ['in_app', 'email'],
        frequency: 'immediate',
      },
      task_assigned: {
        type,
        enabled: true,
        channels: ['in_app', 'email'],
        frequency: 'immediate',
      },
      comment_mentioned: {
        type,
        enabled: true,
        channels: ['in_app', 'email'],
        frequency: 'immediate',
      },
      system_alert: {
        type,
        enabled: true,
        channels: ['in_app', 'email'],
        frequency: 'immediate',
      },
      approval_required: {
        type,
        enabled: true,
        channels: ['in_app', 'email'],
        frequency: 'immediate',
      },
      shift_changed: {
        type,
        enabled: true,
        channels: ['in_app', 'email'],
        frequency: 'immediate',
      },
      holiday_reminder: {
        type,
        enabled: true,
        channels: ['in_app'],
        frequency: 'daily',
      },
    };

    return defaults[type] || {
      type,
      enabled: true,
      channels: ['in_app'],
      frequency: 'immediate',
    };
  }
}

export const notificationPreferenceService = new NotificationPreferenceService();
