import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../common/lib/logger';
import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';
import { NotificationQueueRepository } from '../repositories/notification-queue.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationLogRepository } from '../repositories/notification-log.repository';
import { NotificationEventRepository } from '../repositories/notification-event.repository';

export class DeliveryService {
  private queueRepo: NotificationQueueRepository;
  private notificationRepo: NotificationRepository;
  private logRepo: NotificationLogRepository;
  private eventRepo: NotificationEventRepository;
  private db = getKnex();

  constructor() {
    this.queueRepo = new NotificationQueueRepository();
    this.notificationRepo = new NotificationRepository();
    this.logRepo = new NotificationLogRepository();
    this.eventRepo = new NotificationEventRepository();
  }

  /**
   * Process notification queue
   */
  async processQueue(ctx: TenantContext): Promise<{ processed: number; succeeded: number; failed: number }> {
    logger.info('Starting notification queue processing');

    const items = await this.queueRepo.getPendingItems(ctx, 100);

    let succeeded = 0;
    let failed = 0;

    for (const item of items) {
      try {
        await this.processQueueItem(ctx, item);
        succeeded++;
      } catch (error) {
        logger.error('Queue item processing failed', { itemId: item.id, error });
        failed++;
      }
    }

    logger.info('Queue processing completed', { processed: items.length, succeeded, failed });

    return {
      processed: items.length,
      succeeded,
      failed,
    };
  }

  /**
   * Process single queue item
   */
  private async processQueueItem(ctx: TenantContext, item: any): Promise<void> {
    await this.queueRepo.markProcessing(ctx, item.id);

    try {
      switch (item.channel) {
        case 'email':
          await this.sendViaEmail(ctx, item);
          break;
        case 'sms':
          await this.sendViaSMS(ctx, item);
          break;
        case 'whatsapp':
          await this.sendViaWhatsApp(ctx, item);
          break;
        case 'push':
          await this.sendViaPush(ctx, item);
          break;
        case 'inapp':
          await this.sendViaInApp(ctx, item);
          break;
        case 'webhook':
          await this.sendViaWebhook(ctx, item);
          break;
        default:
          throw new Error(`Unknown channel: ${item.channel}`);
      }
    } catch (error) {
      await this.handleDeliveryFailure(ctx, item, error as Error);
    }
  }

  /**
   * Send via Email — real SMTP delivery via nodemailer transport
   */
  async sendViaEmail(ctx: TenantContext, queueItem: any): Promise<void> {
    const recipientEmail = queueItem.recipient_email;
    if (!recipientEmail) {
      throw new Error('No recipient email address for queue item');
    }

    logger.info(`[DeliveryService] Sending email to ${recipientEmail}`);

    const startTime = Date.now();

    // Resolve notification content for the email body / subject
    const notification = await this.db('notifications')
      .where('id', queueItem.notification_id)
      .first()
      .catch(() => null);

    const subjectLine = notification?.subject_line || 'Notification from Apponext HRMS';
    const bodyText = notification?.body_text || '';

    // Build a clean HTML email wrapper
    const htmlBody = this.wrapNotificationHtml(subjectLine, bodyText, ctx.organizationId);

    // Send via the central mail utility (uses SMTP_HOST/USER/PASS from .env)
    const { sendMail } = await import('../../../common/lib/mail');
    const success = await sendMail({
      to: recipientEmail,
      subject: subjectLine,
      html: htmlBody,
      organizationId: ctx.organizationId,
    });

    const executionTime = Date.now() - startTime;

    if (!success) {
      throw new Error(`sendMail returned false for ${recipientEmail}`);
    }

    // Log the delivery
    await this.logRepo.create(ctx, {
      uuid: uuidv4(),
      notification_id: queueItem.notification_id,
      channel: 'email',
      recipient_address: recipientEmail,
      status: 'sent',
      attempt_number: queueItem.attempt_count + 1,
      provider_response_code: 200,
      execution_time_ms: executionTime,
    } as any);

    await this.handleDeliverySuccess(ctx, queueItem);
  }

  /**
   * Wrap plain-text notification body into a professional HTML template
   */
  private wrapNotificationHtml(subject: string, bodyText: string, _orgId?: number): string {
    if (bodyText.includes('<div style=') || bodyText.includes('<table')) {
      return bodyText; // already formatted
    }
    const lines = bodyText.split('\n');
    let innerHtml = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        innerHtml += '<div style="height:10px;"></div>';
      } else if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
        innerHtml += `<div style="margin:4px 0 4px 12px;font-size:14px;color:#334155;">• ${trimmed.substring(1).trim()}</div>`;
      } else {
        innerHtml += `<p style="margin:4px 0;font-size:14px;color:#334155;line-height:1.6;">${trimmed}</p>`;
      }
    }
    return `<!DOCTYPE html><html><body style="background:#f1f5f9;font-family:sans-serif;padding:30px 10px;">
<table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:24px;color:#fff;">
<h2 style="margin:0;font-size:18px;">Apponext HRMS</h2>
<p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">${subject}</p>
</td></tr>
<tr><td style="padding:28px;">${innerHtml}</td></tr>
<tr><td style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
Automated notification from <strong>Apponext HRMS</strong>.
</td></tr></table></body></html>`;
  }

  /**
   * Send via SMS
   */
  async sendViaSMS(ctx: TenantContext, queueItem: any): Promise<void> {
    logger.info(`Sending SMS to ${queueItem.recipient_phone}`);

    // TODO: Implement actual SMS provider integration (Twilio, AWS SNS, etc.)
    const startTime = Date.now();

    // Simulate SMS sending
    await new Promise((resolve) => setTimeout(resolve, 100));

    const executionTime = Date.now() - startTime;

    await this.logRepo.create(ctx, {
      uuid: uuidv4(),
      notification_id: queueItem.notification_id,
      channel: 'sms',
      recipient_address: queueItem.recipient_phone,
      status: 'sent',
      attempt_number: queueItem.attempt_count + 1,
      provider_response_code: 200,
      execution_time_ms: executionTime,
    } as any);

    await this.handleDeliverySuccess(ctx, queueItem);
  }

  /**
   * Send via WhatsApp
   */
  async sendViaWhatsApp(ctx: TenantContext, queueItem: any): Promise<void> {
    logger.info(`Sending WhatsApp to ${queueItem.recipient_phone}`);

    // TODO: Implement WhatsApp provider integration
    const startTime = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const executionTime = Date.now() - startTime;

    await this.logRepo.create(ctx, {
      uuid: uuidv4(),
      notification_id: queueItem.notification_id,
      channel: 'whatsapp',
      recipient_address: queueItem.recipient_phone,
      status: 'sent',
      attempt_number: queueItem.attempt_count + 1,
      provider_response_code: 200,
      execution_time_ms: executionTime,
    } as any);

    await this.handleDeliverySuccess(ctx, queueItem);
  }

  /**
   * Send via Push
   */
  async sendViaPush(ctx: TenantContext, queueItem: any): Promise<void> {
    logger.info(`Sending Push notification`);

    // TODO: Implement Firebase Cloud Messaging integration
    const startTime = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const executionTime = Date.now() - startTime;

    await this.logRepo.create(ctx, {
      uuid: uuidv4(),
      notification_id: queueItem.notification_id,
      channel: 'push',
      recipient_address: queueItem.recipient_push_token || 'unknown',
      status: 'sent',
      attempt_number: queueItem.attempt_count + 1,
      provider_response_code: 200,
      execution_time_ms: executionTime,
    } as any);

    await this.handleDeliverySuccess(ctx, queueItem);
  }

  /**
   * Send via In-App
   */
  async sendViaInApp(ctx: TenantContext, queueItem: any): Promise<void> {
    logger.info(`Creating in-app notification`);

    // In-app notifications are already stored in DB, just mark as delivered
    const startTime = Date.now();
    const executionTime = Date.now() - startTime;

    await this.logRepo.create(ctx, {
      uuid: uuidv4(),
      notification_id: queueItem.notification_id,
      channel: 'inapp',
      recipient_address: 'in-app',
      status: 'delivered',
      attempt_number: queueItem.attempt_count + 1,
      provider_response_code: 200,
      execution_time_ms: executionTime,
    } as any);

    await this.handleDeliverySuccess(ctx, queueItem);
  }

  /**
   * Send via Webhook
   */
  async sendViaWebhook(ctx: TenantContext, queueItem: any): Promise<void> {
    logger.info(`Sending webhook to ${queueItem.recipient_webhook_url}`);

    // TODO: Implement HTTP webhook sending
    const startTime = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const executionTime = Date.now() - startTime;

    await this.logRepo.create(ctx, {
      uuid: uuidv4(),
      notification_id: queueItem.notification_id,
      channel: 'webhook',
      recipient_address: queueItem.recipient_webhook_url || 'unknown',
      status: 'sent',
      attempt_number: queueItem.attempt_count + 1,
      provider_response_code: 200,
      execution_time_ms: executionTime,
    } as any);

    await this.handleDeliverySuccess(ctx, queueItem);
  }

  /**
   * Handle delivery success
   */
  private async handleDeliverySuccess(ctx: TenantContext, queueItem: any): Promise<void> {
    await this.queueRepo.markDelivered(ctx, queueItem.id, 200);

    // Update notification status to delivered
    await this.notificationRepo.update(ctx, queueItem.notification_id, {
      status: 'delivered',
      sent_at: new Date(),
    } as any);

    logger.info(`Delivery successful: ${queueItem.uuid}`);
  }

  /**
   * Handle delivery failure
   */
  private async handleDeliveryFailure(ctx: TenantContext, queueItem: any, error: Error): Promise<void> {
    const event = await this.eventRepo.getByCode(ctx, 'some_event_code'); // TODO: Get from notification

    const retryCount = event?.retry_count || 3;
    const retryInterval = event?.retry_interval_minutes || 5;

    await this.queueRepo.markFailedWithRetry(
      ctx,
      queueItem.id,
      error.message,
      retryInterval,
      retryCount
    );

    await this.logRepo.create(ctx, {
      uuid: uuidv4(),
      notification_id: queueItem.notification_id,
      channel: queueItem.channel,
      recipient_address: queueItem.recipient_email || queueItem.recipient_phone || 'unknown',
      status: 'failed',
      attempt_number: queueItem.attempt_count + 1,
      provider_response_body: error.message,
    } as any);

    logger.error(`Delivery failed: ${queueItem.uuid}`, { error: error.message });
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications(ctx: TenantContext): Promise<number> {
    logger.info('Retrying failed notifications');

    const failedItems = await this.db('notification_queue')
      .where('organization_id', ctx.organizationId)
      .where('status', 'failed')
      .where('next_attempt_at', '<=', new Date());

    let retried = 0;
    for (const item of failedItems) {
      try {
        await this.queueRepo.update(ctx, item.id, { status: 'pending' } as any);
        retried++;
      } catch (error) {
        logger.error('Retry failed', { itemId: item.id, error });
      }
    }

    return retried;
  }
}


