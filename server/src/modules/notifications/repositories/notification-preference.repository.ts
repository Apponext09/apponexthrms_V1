import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface NotificationPreference {
  id: number;
  uuid: string;
  organization_id: number;
  user_id: number;
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  push_enabled: boolean;
  inapp_enabled: boolean;
  webhook_enabled: boolean;
  quiet_hours_start?: string; // TIME
  quiet_hours_end?: string; // TIME
  quiet_hours_enabled: boolean;
  unsubscribe_all: boolean;
  preferences_json: Record<string, any>; // JSON object
  created_by: number;
  updated_by: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export class NotificationPreferenceRepository extends BaseRepository<NotificationPreference> {
  constructor() {
    super('notification_preferences');
  }

  /**
   * Get preferences for user
   */
  async getByUserId(ctx: TenantContext, userId: number): Promise<NotificationPreference | null> {
    return this.query(ctx).where('user_id', userId).first() as Promise<
      NotificationPreference | null
    >;
  }

  /**
   * Get or create preferences for user
   */
  async getOrCreateForUser(ctx: TenantContext, userId: number, createdBy: number): Promise<NotificationPreference> {
    const existing = await this.getByUserId(ctx, userId);
    if (existing) {
      return existing;
    }

    return this.create(ctx, {
      user_id: userId,
      email_enabled: true,
      sms_enabled: true,
      whatsapp_enabled: true,
      push_enabled: true,
      inapp_enabled: true,
      webhook_enabled: true,
      quiet_hours_enabled: false,
      unsubscribe_all: false,
      preferences_json: {},
      created_by: createdBy,
      updated_by: createdBy,
    } as any);
  }

  /**
   * Check if channel is enabled for user
   */
  async isChannelEnabled(ctx: TenantContext, userId: number, channel: string): Promise<boolean> {
    if (await this.isUnsubscribedFromAll(ctx, userId)) {
      return false;
    }

    const prefs = await this.getByUserId(ctx, userId);
    if (!prefs) {
      return true; // Default to enabled if no preferences set
    }

    const channelField = `${channel}_enabled`;
    return (prefs as any)[channelField] !== false;
  }

  /**
   * Check if category is enabled for channel
   */
  async isCategoryEnabled(
    ctx: TenantContext,
    userId: number,
    category: string,
    channel: string
  ): Promise<boolean> {
    if (!(await this.isChannelEnabled(ctx, userId, channel))) {
      return false;
    }

    const prefs = await this.getByUserId(ctx, userId);
    if (!prefs?.preferences_json?.[category]) {
      return true; // Default to enabled
    }

    const categoryPrefs = prefs.preferences_json[category];
    return categoryPrefs[channel] !== false;
  }

  /**
   * Check if user is in quiet hours
   */
  isInQuietHours(prefs: NotificationPreference): boolean {
    if (!prefs.quiet_hours_enabled || !prefs.quiet_hours_start || !prefs.quiet_hours_end) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMin] = prefs.quiet_hours_start.split(':').map(Number);
    const [endHour, endMin] = prefs.quiet_hours_end.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Check if user is unsubscribed from all
   */
  async isUnsubscribedFromAll(ctx: TenantContext, userId: number): Promise<boolean> {
    const prefs = await this.getByUserId(ctx, userId);
    return prefs?.unsubscribe_all || false;
  }

  /**
   * Get searchable fields - empty for preferences
   */
  protected getSearchableFields(): string[] {
    return [];
  }
}
