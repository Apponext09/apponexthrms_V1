import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../common/lib/logger';
import { getKnex } from '../../../db/knex';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';
import { NotificationRepository, type Notification } from '../repositories/notification.repository';
import { NotificationTemplateRepository } from '../repositories/notification-template.repository';
import { NotificationEventRepository } from '../repositories/notification-event.repository';
import { NotificationRecipientRepository } from '../repositories/notification-recipient.repository';
import { NotificationQueueRepository } from '../repositories/notification-queue.repository';
import { NotificationPreferenceRepository } from '../repositories/notification-preference.repository';
import { TemplateService } from './template.service';
import { NotificationPreferenceService } from './notification-preference.service';

export class NotificationService {
  private notificationRepo: NotificationRepository;
  private templateRepo: NotificationTemplateRepository;
  private eventRepo: NotificationEventRepository;
  private recipientRepo: NotificationRecipientRepository;
  private queueRepo: NotificationQueueRepository;
  private preferenceRepo: NotificationPreferenceRepository;
  private templateService: TemplateService;
  private preferenceService: NotificationPreferenceService;
  private db = getKnex();

  constructor() {
    this.notificationRepo = new NotificationRepository();
    this.templateRepo = new NotificationTemplateRepository();
    this.eventRepo = new NotificationEventRepository();
    this.recipientRepo = new NotificationRecipientRepository();
    this.queueRepo = new NotificationQueueRepository();
    this.preferenceRepo = new NotificationPreferenceRepository();
    this.templateService = new TemplateService();
    this.preferenceService = new NotificationPreferenceService();
  }

  /**
   * Send a notification
   */
  async sendNotification(
    ctx: TenantContext,
    input: {
      eventCode: string;
      recipientId: number;
      variables: Record<string, any>;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      channels?: string[];
      scheduledAt?: Date;
    }
  ): Promise<Notification> {
    if (!input?.eventCode) {
      throw new ValidationError(`Event code is required for notification`);
    }

    // Get event
    const event = await this.eventRepo.getByCode(ctx, input.eventCode).catch(() => null);

    // Get template
    let template: any = null;
    if (event?.default_template_id) {
      template = await this.templateRepo.getById(ctx, event.default_template_id).catch(() => null);
    }

    // Fallback template if missing
    if (!template) {
      template = {
        id: 1,
        category: 'recruitment',
        channels: ['inapp'],
        is_published: true,
        is_active: 'Yes',
        subject_line: input.eventCode.replace(/_/g, ' '),
        body_text: Object.entries(input.variables || {})
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n'),
      };
    }

    // Safely normalize channels
    let channels: string[] = ['inapp'];
    const rawChannels = input.channels || template.channels;
    if (Array.isArray(rawChannels)) {
      channels = rawChannels;
    } else if (typeof rawChannels === 'string') {
      try { channels = JSON.parse(rawChannels); } catch { channels = [rawChannels]; }
    }

    // Render template
    const rendered = await this.templateService.renderTemplate(template, input.variables || {}).catch(() => ({
      subject_line: template.subject_line || input.eventCode,
      body_text: template.body_text || '',
    }));

    // Create notification
    const notification = await this.notificationRepo.create(ctx, {
      uuid: uuidv4(),
      event_code: input.eventCode,
      template_id: template.id || 1,
      recipient_id: input.recipientId,
      channels: channels,
      subject_line: rendered.subject_line,
      body_text: rendered.body_text,
      variables: input.variables || {},
      status: 'queued',
      priority: input.priority || 'normal',
      scheduled_at: input.scheduledAt,
      retry_count: 0,
      created_by: ctx.userId || 1,
      updated_by: ctx.userId || 1,
    } as any);

    // Create queue items for each channel
    for (const channel of channels) {
      await this.createQueueItem(ctx, notification, channel, template).catch(() => {});
    }

    // Emit real-time notification to user via EventBus / Socket
    try {
      const { publishEvent } = await import('../../../realtime/eventBus');
      publishEvent('notification:broadcast_to_user', {
        userId: input.recipientId,
        payload: {
          id: notification.id,
          subject_line: notification.subject_line,
          body_text: notification.body_text,
          priority: notification.priority,
          created_at: notification.created_at,
        }
      });
    } catch { /* socket broadcast failure is non-fatal */ }

    logger.info(`Notification created: ${notification.uuid}`);
    return notification;
  }

  /**
   * Get user notifications
   */
  async getNotifications(
    ctx: TenantContext,
    options: any = {}
  ): Promise<{ items: Notification[]; meta: any }> {
    return this.notificationRepo.getUserNotifications(ctx, ctx.userId, options);
  }

  /**
   * Get unread count
   */
  async getUnreadCount(ctx: TenantContext): Promise<number> {
    return this.notificationRepo.getUnreadCount(ctx, ctx.userId);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(ctx: TenantContext, notificationId: number): Promise<Notification> {
    const notification = await this.notificationRepo.getById(ctx, notificationId);
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    const db = getKnex();
    const user = await db('users').where('id', ctx.userId).first().catch(() => null);
    const userEmpId = user?.employee_id;
    const isRecipient = String(notification.recipient_id) === String(ctx.userId) ||
      (userEmpId && String(notification.recipient_id) === String(userEmpId)) ||
      !notification.recipient_id;

    if (!isRecipient) {
      // Allow if user is admin/hr manager
      const roles = user?.roles || [];
      const isAdmin = roles.includes('organization_admin') || roles.includes('hr') || roles.includes('hr_admin') || roles.includes('hr_manager');
      if (!isAdmin) {
        throw new ValidationError('Unauthorized');
      }
    }

    return this.notificationRepo.markAsRead(ctx, notificationId, ctx.userId);
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(ctx: TenantContext): Promise<number> {
    return this.notificationRepo.markAllAsRead(ctx, ctx.userId);
  }

  /**
   * Delete notification
   */
  async deleteNotification(ctx: TenantContext, notificationId: number): Promise<void> {
    const notification = await this.notificationRepo.getById(ctx, notificationId);
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    const db = getKnex();
    const user = await db('users').where('id', ctx.userId).first().catch(() => null);
    const userEmpId = user?.employee_id;
    const isRecipient = String(notification.recipient_id) === String(ctx.userId) ||
      (userEmpId && String(notification.recipient_id) === String(userEmpId)) ||
      !notification.recipient_id;

    if (!isRecipient) {
      const roles = user?.roles || [];
      const isAdmin = roles.includes('organization_admin') || roles.includes('hr') || roles.includes('hr_admin') || roles.includes('hr_manager');
      if (!isAdmin) {
        throw new ValidationError('Unauthorized');
      }
    }

    await this.notificationRepo.delete(ctx, notificationId);
  }

  /**
   * Get notification detail
   */
  async getNotification(ctx: TenantContext, notificationId: number): Promise<Notification> {
    const notification = await this.notificationRepo.getById(ctx, notificationId);
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.recipient_id !== ctx.userId) {
      throw new ValidationError('Unauthorized');
    }

    return notification;
  }

  /**
   * Create queue item for notification delivery
   */
  private async createQueueItem(ctx: TenantContext, notification: Notification, channel: string, template: any): Promise<void> {
    // Get recipient details based on channel
    const recipientData = await this.getRecipientDataForChannel(ctx, notification.recipient_id, channel);

    if (!recipientData) {
      logger.warn(`No recipient data for channel ${channel}, user ${notification.recipient_id}`);
      return;
    }

    await this.queueRepo.create(ctx, {
      uuid: uuidv4(),
      notification_id: notification.id,
      channel,
      recipient_email: recipientData.email,
      recipient_phone: recipientData.phone,
      recipient_push_token: recipientData.pushToken,
      recipient_webhook_url: recipientData.webhookUrl,
      status: 'pending',
      priority: this.getPriorityScore(notification.priority),
      attempt_count: 0,
    } as any);
  }

  /**
   * Get recipient data for specific channel
   */
  private async getRecipientDataForChannel(
    ctx: TenantContext,
    userId: number,
    channel: string
  ): Promise<any> {
    const user = await this.db('users').where('id', userId).first();
    if (!user) {
      return null;
    }

    // TODO: Extend with device tokens, webhook URLs, etc.
    return {
      email: user.email,
      phone: null,
      pushToken: null,
      webhookUrl: null,
    };
  }

  /**
   * Convert priority to numeric score
   */
  private getPriorityScore(priority: string): number {
    const scores: Record<string, number> = {
      low: 1,
      normal: 5,
      high: 10,
      urgent: 20,
    };

    return scores[priority] || 5;
  }
}


