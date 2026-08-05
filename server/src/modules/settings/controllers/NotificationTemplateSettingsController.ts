import type { Request, Response } from 'express';
import { z } from 'zod';
import { GenericSettingsController } from './GenericSettingsController';
import { GenericSettingsService } from '../services/GenericSettingsService';
import { NotificationTemplateSettingsRepository } from '../repositories/NotificationTemplateSettingsRepository';

const notifTemplateBaseSchema = z.object({
  template_name: z.string().min(1, 'Template name is required').max(255, 'Template name must be under 255 characters'),
  subject: z.string().min(1, 'Subject is required').max(500, 'Subject must be under 500 characters'),
  email_notification: z.string().min(1, 'Email notification content is required'),
  is_active: z.enum(['Yes', 'No']).default('Yes'),
});

const notifTemplateCreateSchema = notifTemplateBaseSchema;
const notifTemplateUpdateSchema = notifTemplateBaseSchema.partial();

export class NotificationTemplateSettingsController extends GenericSettingsController {
  constructor() {
    const repository = new NotificationTemplateSettingsRepository();
    const service = new GenericSettingsService(repository, 'NOTIFICATION_TEMPLATE', '');
    super(service, 'Notification Template');
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = notifTemplateCreateSchema.parse(req.body);
      req.body = validatedData;
      await super.create(req, res);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
        return;
      }
      throw error;
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = notifTemplateUpdateSchema.parse(req.body);
      req.body = validatedData;
      await super.update(req, res);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
        return;
      }
      throw error;
    }
  }
}
