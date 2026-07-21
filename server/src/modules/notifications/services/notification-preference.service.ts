import { logger } from '@/common/lib/logger';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';
import { NotificationPreferenceRepository, type NotificationPreference } from '../repositories/notification-preference.repository';

export class NotificationPreferenceService {
  private preferenceRepo: NotificationPreferenceRepository;

  constructor() {
    this.preferenceRepo = new NotificationPreferenceRepository();
  }

  /**
   * Get user preferences
   */
  async getPreferences(ctx: TenantContext): Promise<NotificationPreference> {
    let prefs = await this.preferenceRepo.getByUserId(ctx, ctx.userId);

    if (!prefs) {
      // Create default preferences
      prefs = await this.preferenceRepo.getOrCreateForUser(ctx, ctx.userId, ctx.userId);
    }

    return prefs;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(ctx: TenantContext, input: any): Promise<NotificationPreference> {
    let prefs = await this.preferenceRepo.getByUserId(ctx, ctx.userId);

    if (!prefs) {
      prefs = await this.preferenceRepo.getOrCreateForUser(ctx, ctx.userId, ctx.userId);
    }

    const updated = await this.preferenceRepo.update(ctx, prefs.id, {
      email_enabled: input.email_enabled !== undefined ? input.email_enabled : prefs.email_enabled,
      sms_enabled: input.sms_enabled !== undefined ? input.sms_enabled : prefs.sms_enabled,
      whatsapp_enabled: input.whatsapp_enabled !== undefined ? input.whatsapp_enabled : prefs.whatsapp_enabled,
      push_enabled: input.push_enabled !== undefined ? input.push_enabled : prefs.push_enabled,
      inapp_enabled: input.inapp_enabled !== undefined ? input.inapp_enabled : prefs.inapp_enabled,
      webhook_enabled: input.webhook_enabled !== undefined ? input.webhook_enabled : prefs.webhook_enabled,
      quiet_hours_start: input.quiet_hours_start !== undefined ? input.quiet_hours_start : prefs.quiet_hours_start,
      quiet_hours_end: input.quiet_hours_end !== undefined ? input.quiet_hours_end : prefs.quiet_hours_end,
      quiet_hours_enabled: input.quiet_hours_enabled !== undefined ? input.quiet_hours_enabled : prefs.quiet_hours_enabled,
      unsubscribe_all: input.unsubscribe_all !== undefined ? input.unsubscribe_all : prefs.unsubscribe_all,
      preferences_json: input.preferences_json !== undefined ? input.preferences_json : prefs.preferences_json,
      updated_by: ctx.userId,
    } as any);

    logger.info(`Preferences updated for user: ${ctx.userId}`);
    return updated;
  }

  /**
   * Check if should send notification
   */
  async shouldSendNotification(
    ctx: TenantContext,
    userId: number,
    category: string,
    channels: string[]
  ): Promise<boolean> {
    const prefs = await this.preferenceRepo.getByUserId(ctx, userId);

    if (!prefs) {
      return true; // Default to send if no preferences set
    }

    // Check unsubscribe all
    if (prefs.unsubscribe_all) {
      return false;
    }

    // Check quiet hours for non-urgent notifications
    if (this.preferenceRepo.isInQuietHours(prefs)) {
      return false;
    }

    // Check if any channel is enabled for this category
    for (const channel of channels) {
      if (await this.isChannelEnabledForCategory(ctx, userId, category, channel)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if channel is enabled
   */
  async isChannelEnabled(ctx: TenantContext, userId: number, channel: string): Promise<boolean> {
    return this.preferenceRepo.isChannelEnabled(ctx, userId, channel);
  }

  /**
   * Check if category is enabled for channel
   */
  async isCategoryEnabled(ctx: TenantContext, userId: number, category: string, channel: string): Promise<boolean> {
    return this.preferenceRepo.isCategoryEnabled(ctx, userId, category, channel);
  }

  /**
   * Check if channel is enabled for category
   */
  private async isChannelEnabledForCategory(
    ctx: TenantContext,
    userId: number,
    category: string,
    channel: string
  ): Promise<boolean> {
    // First check if channel is globally enabled
    const channelEnabled = await this.preferenceRepo.isChannelEnabled(ctx, userId, channel);
    if (!channelEnabled) {
      return false;
    }

    // Then check category-specific setting
    return this.preferenceRepo.isCategoryEnabled(ctx, userId, category, channel);
  }
}


